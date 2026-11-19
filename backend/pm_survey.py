"""ProcessMaker survey cases.

Two jobs live here, both modelled on how the Reapit integration talks to PM:

1. `create_survey_case` runs once, right after the seller has signed and RPSA
   has accepted the order. It logs into PM, starts a case (POST
   /workflow/cases), sets the "survey case" variable by hand (the same way
   `buyerFound` is set for Reapit cases) and routes the case.

2. `run_rpsa_sync` is called by a scheduler every few hours. For every survey
   case that is still open it asks RPSA for an update (ticket #537) and writes
   the result onto the PM case as case variables.

Everything is driven by environment variables. With PM_BASE_URL (or the process
and task UIDs) unset, nothing here touches ProcessMaker, so dev and test runs
never create live cases. Items marked TODO(PM) are placeholders until the PM
side confirms the real names.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import httpx
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# --------------------------- configuration ---------------------------
# e.g. https://reservation.gazeal.co.uk  (no trailing slash, no /api path)
PM_BASE_URL = os.environ.get("PM_BASE_URL", "").rstrip("/")
# PM workspace name used in the OAuth URL: /{workspace}/oauth2/token.
# Reapit's code uses "workflow".
PM_WORKSPACE = os.environ.get("PM_WORKSPACE", "workflow")
PM_CLIENT_ID = os.environ.get("PM_CLIENT_ID", "")
PM_CLIENT_SECRET = os.environ.get("PM_CLIENT_SECRET", "")
# Dedicated PM user the survey app logs in as (the case is created as them).
PM_SERVICE_USERNAME = os.environ.get("PM_SERVICE_USERNAME", "")
PM_SERVICE_PASSWORD = os.environ.get("PM_SERVICE_PASSWORD", "")
# TODO(PM): process and task UIDs for survey cases. Reapit cases use one
# process/task pair; surveys are expected to use the same process and be told
# apart by the survey variable below.
PM_SURVEY_PRO_UID = os.environ.get("PM_SURVEY_PRO_UID", "")
PM_SURVEY_TAS_UID = os.environ.get("PM_SURVEY_TAS_UID", "")
# TODO(PM): the new variable Vipin is creating, and the value that marks a
# case as a survey case.
PM_SURVEY_FLAG_VARIABLE = os.environ.get("PM_SURVEY_FLAG_VARIABLE", "surveyCase")
PM_SURVEY_FLAG_VALUE = os.environ.get("PM_SURVEY_FLAG_VALUE", "Yes")

# RPSA update endpoint (ticket #537).
# TODO(#537): confirm URL, auth and response shape.
RPSA_STATUS_URL = os.environ.get("RPSA_STATUS_URL", "")
RPSA_STATUS_TOKEN = os.environ.get("RPSA_STATUS_TOKEN", "")
RPSA_STATUS_PARAM = os.environ.get("RPSA_STATUS_PARAM", "rpsaref")
# Map of PM case variable -> key in RPSA's response (dotted path allowed), as
# JSON, e.g. {"rpsaSurveyStatus": "status", "rpsaSurveyDate": "booking.date"}.
# TODO(PM): the real field names. When empty, the whole response is stored as
# JSON in PM_RPSA_RAW_VARIABLE so nothing is lost.
PM_RPSA_FIELD_MAP = os.environ.get("PM_RPSA_FIELD_MAP", "")
PM_RPSA_RAW_VARIABLE = os.environ.get("PM_RPSA_RAW_VARIABLE", "rpsaLatestResponse")
# Stop polling a case once RPSA's status key holds one of these values.
RPSA_STATUS_KEY = os.environ.get("RPSA_STATUS_KEY", "status")
RPSA_COMPLETE_STATUSES = [
    s.strip().lower()
    for s in os.environ.get("RPSA_COMPLETE_STATUSES", "").split(",")
    if s.strip()
]
RPSA_SYNC_MAX_AGE_DAYS = int(os.environ.get("RPSA_SYNC_MAX_AGE_DAYS", "120"))

# Shared secret the scheduler sends in the X-Cron-Secret header.
CRON_SECRET = os.environ.get("CRON_SECRET", "")


def case_creation_enabled() -> bool:
    return bool(
        PM_BASE_URL
        and PM_CLIENT_ID
        and PM_SERVICE_USERNAME
        and PM_SURVEY_PRO_UID
        and PM_SURVEY_TAS_UID
    )


def sync_enabled() -> bool:
    return bool(PM_BASE_URL and PM_CLIENT_ID and PM_SERVICE_USERNAME and RPSA_STATUS_URL)


# --------------------------- pure helpers ---------------------------
def _split_name(full_name: str) -> tuple[str, str]:
    parts = (full_name or "").strip().split()
    if not parts:
        return "", ""
    return parts[0], " ".join(parts[1:])


def build_case_variables(payload: dict, rpsa_id: Optional[str]) -> dict:
    """Case variables for a new survey case.

    `payload` is the RPSA webhook payload (flat fields plus the sale-room
    package). The property and vendor names follow the existing PM variables
    used by the Reapit cases, so the same forms and triggers can read them.
    """
    seller = payload.get("seller") or {}
    prop = payload.get("property") or {}
    agent = payload.get("agent") or {}
    first, last = _split_name(seller.get("name") or payload.get("ClientName") or "")
    ref = payload.get("GazealReference") or payload.get("reference_number") or ""
    address = prop.get("address_line_1") or payload.get("PropertyAddress") or ""
    postcode = prop.get("postcode") or payload.get("PropertyPostcode") or ""
    price = payload.get("PropertyPrice") or ""
    return {
        # Set by hand, like buyerFound on a Reapit case.
        PM_SURVEY_FLAG_VARIABLE: PM_SURVEY_FLAG_VALUE,
        "propertyReferenceTitle": f"Survey: {ref}" if ref else "Survey",
        "propertyDetailsStreetNumber": address,
        "propertyDetailsPostCode": postcode,
        "propertyDetailsSalePrice": str(price),
        "numberOfvendors": "1",
        "vendorPrimaryClientFirstName": first,
        "vendorPrimaryClientLastName": last,
        "vendorPrimaryClientEmail": seller.get("email") or payload.get("ClientEmail") or "",
        "vendorPrimaryClientPhoneMobile": seller.get("phone") or payload.get("ClientMobile") or "",
        "buyerFound": "No",
        "buyerNeedsForms": "No",
        # TODO(PM): confirm these survey-specific variable names.
        "surveyGazealRef": ref,
        "surveyRpsaRef": rpsa_id or "",
        "surveyAgentName": agent.get("name") or "",
        "surveyAgentAgency": agent.get("agency") or "",
        "surveyAgentBranch": agent.get("branch") or "",
        "surveyAgentEmail": agent.get("email") or "",
    }


def _dig(data: Any, path: str) -> Any:
    cur = data
    for part in path.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return None
    return cur


def map_rpsa_update(response: Any) -> dict:
    """Turn RPSA's response into PM case variables.

    With a field map: each mapped value that RPSA returned becomes a variable.
    Without one: the whole response goes into one JSON variable.
    """
    if PM_RPSA_FIELD_MAP:
        try:
            mapping = json.loads(PM_RPSA_FIELD_MAP)
        except ValueError:
            logger.error("PM_RPSA_FIELD_MAP is not valid JSON; ignoring it")
            mapping = {}
        out = {}
        for pm_var, key in mapping.items():
            value = _dig(response, key)
            if value is not None:
                out[pm_var] = value if isinstance(value, str) else json.dumps(value)
        if out:
            return out
    return {PM_RPSA_RAW_VARIABLE: json.dumps(response, default=str)}


def is_complete(response: Any) -> bool:
    if not RPSA_COMPLETE_STATUSES or not isinstance(response, dict):
        return False
    status = _dig(response, RPSA_STATUS_KEY)
    return str(status or "").strip().lower() in RPSA_COMPLETE_STATUSES


def _digest(value: Any) -> str:
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, default=str).encode()
    ).hexdigest()


# --------------------------- PM calls ---------------------------
async def get_pm_token(client: httpx.AsyncClient) -> str:
    resp = await client.post(
        f"{PM_BASE_URL}/{PM_WORKSPACE}/oauth2/token",
        json={
            "grant_type": "password",
            "scope": "*",
            "client_id": PM_CLIENT_ID,
            "client_secret": PM_CLIENT_SECRET,
            "username": PM_SERVICE_USERNAME,
            "password": PM_SERVICE_PASSWORD,
        },
    )
    resp.raise_for_status()
    token = resp.json().get("access_token")
    if not token:
        raise RuntimeError("PM OAuth reply had no access_token")
    return token


async def _start_and_route_case(variables: dict) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        token = await get_pm_token(client)
        headers = {"Authorization": f"Bearer {token}"}
        resp = await client.post(
            f"{PM_BASE_URL}/api/1.0/workflow/cases",
            headers=headers,
            json={
                "pro_uid": PM_SURVEY_PRO_UID,
                "tas_uid": PM_SURVEY_TAS_UID,
                "variables": [variables],
            },
        )
        resp.raise_for_status()
        created = resp.json()
        app_uid = created["app_uid"]
        # Same as the Reapit flow: route the case, running the triggers that
        # fire before assignment.
        route = await client.put(
            f"{PM_BASE_URL}/api/1.0/workflow/cases/{app_uid}/route-case",
            headers=headers,
            json={"executeTriggersBeforeAssignment": True},
        )
        route.raise_for_status()
        return {"app_uid": app_uid, "app_number": created.get("app_number")}


async def _update_case_variables(app_uid: str, variables: dict) -> None:
    async with httpx.AsyncClient(timeout=30.0) as client:
        token = await get_pm_token(client)
        resp = await client.put(
            f"{PM_BASE_URL}/api/1.0/workflow/cases/{app_uid}/variable",
            headers={"Authorization": f"Bearer {token}"},
            json=variables,
        )
        resp.raise_for_status()


# --------------------------- 1. create the case ---------------------------
async def create_survey_case(
    db: AsyncIOMotorDatabase, token: str, payload: dict, rpsa_id: Optional[str]
) -> None:
    """Create the PM case for a signed survey, once.

    The agreement is the lock: if it already holds a PM case (created or being
    created), this does nothing, so a double signature or a replay cannot
    create a second case. Three attempts (immediately, +30s, +120s); the
    outcome is kept on the agreement under `pm_case`.
    """
    if not case_creation_enabled():
        logger.warning(
            "PM case settings not complete — no PM case created for %s", token
        )
        return

    claimed = await db.agreements.update_one(
        {"token": token, "pm_case.status": {"$nin": ["creating", "created"]}},
        {
            "$set": {
                "pm_case": {
                    "status": "creating",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                }
            }
        },
    )
    if not claimed.modified_count:
        logger.info("PM case already created or in progress for %s", token)
        return

    variables = build_case_variables(payload, rpsa_id)
    last_error = None
    for n, delay in enumerate([0, 30, 120], start=1):
        if delay:
            await asyncio.sleep(delay)
        at = datetime.now(timezone.utc).isoformat()
        try:
            result = await _start_and_route_case(variables)
            await db.agreements.update_one(
                {"token": token},
                {
                    "$set": {
                        "pm_case": {
                            "status": "created",
                            "app_uid": result["app_uid"],
                            "app_number": result["app_number"],
                            "created_at": at,
                            "attempts": n,
                        },
                        "rpsa_sync": {"complete": False, "runs": 0},
                    }
                },
            )
            return
        except Exception as exc:  # noqa: BLE001
            last_error = str(exc)[:500]
            await db.agreements.update_one(
                {"token": token},
                {
                    "$set": {
                        "pm_case": {
                            "status": "creating" if n < 3 else "failed",
                            "at": at,
                            "attempts": n,
                            "error": last_error,
                        }
                    }
                },
            )
    logger.error("PM case creation failed after 3 attempts for %s: %s", token, last_error)


# --------------------------- 2. RPSA sync ---------------------------
async def _fetch_rpsa_update(rpsa_id: str) -> Any:
    headers = {"Authorization": f"Bearer {RPSA_STATUS_TOKEN}"} if RPSA_STATUS_TOKEN else {}
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(
            RPSA_STATUS_URL, params={RPSA_STATUS_PARAM: rpsa_id}, headers=headers
        )
    resp.raise_for_status()
    try:
        return resp.json()
    except ValueError:
        # RPSA wraps JSON in debug text on some endpoints; dig it out.
        text = resp.text
        return json.loads(text[text.find("{"): text.rfind("}") + 1])


async def run_rpsa_sync(db: AsyncIOMotorDatabase) -> dict:
    """Ask RPSA for an update on every open survey case and push it to PM."""
    summary = {"checked": 0, "updated": 0, "unchanged": 0, "completed": 0, "errors": 0}
    if not sync_enabled():
        summary["skipped"] = "RPSA/PM sync settings not complete"
        return summary

    cutoff = (datetime.now(timezone.utc) - timedelta(days=RPSA_SYNC_MAX_AGE_DAYS)).isoformat()
    cursor = db.agreements.find(
        {
            "pm_case.status": "created",
            "rpsa_sync.complete": {"$ne": True},
            "pm_case.created_at": {"$gte": cutoff},
            "rpsa_webhook.rpsa_id": {"$exists": True, "$ne": ""},
        },
        {"token": 1, "pm_case": 1, "rpsa_sync": 1, "rpsa_webhook.rpsa_id": 1},
    )
    async for doc in cursor:
        summary["checked"] += 1
        token = doc["token"]
        now = datetime.now(timezone.utc).isoformat()
        try:
            response = await _fetch_rpsa_update(doc["rpsa_webhook"]["rpsa_id"])
            digest = _digest(response)
            done = is_complete(response)
            sync_set = {
                "rpsa_sync.last_run_at": now,
                "rpsa_sync.last_error": None,
                "rpsa_sync.complete": done,
            }
            if digest == (doc.get("rpsa_sync") or {}).get("last_digest"):
                summary["unchanged"] += 1
            else:
                await _update_case_variables(
                    doc["pm_case"]["app_uid"], map_rpsa_update(response)
                )
                sync_set["rpsa_sync.last_digest"] = digest
                sync_set["rpsa_sync.last_response"] = response
                sync_set["rpsa_sync.last_updated_at"] = now
                summary["updated"] += 1
            if done:
                summary["completed"] += 1
            await db.agreements.update_one(
                {"token": token},
                {"$set": sync_set, "$inc": {"rpsa_sync.runs": 1}},
            )
        except Exception as exc:  # noqa: BLE001
            summary["errors"] += 1
            logger.error("RPSA sync failed for %s: %s", token, exc)
            await db.agreements.update_one(
                {"token": token},
                {
                    "$set": {
                        "rpsa_sync.last_run_at": now,
                        "rpsa_sync.last_error": str(exc)[:500],
                    }
                },
            )
    return summary
