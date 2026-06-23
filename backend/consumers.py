"""API consumer registry — models, key generation, auth dependencies, lead reshaping.

A "consumer" is anything that talks to our public API: RPSA, a CRM (HubSpot,
Salesforce), an internal dashboard, a Zapier pipe, etc. Each consumer has:
  - a personal API key (only the SHA-256 hash is stored)
  - a personal webhook secret (used to HMAC-sign outbound webhook deliveries)
  - a list of scopes (which leads they can read, which webhooks they receive)
  - an optional webhook URL (we POST to it on every matching event)

Scopes use a ":"-separated namespace with "*" wildcards:
  leads:order:read     – can read order_survey lead records
  leads:learn:read     – can read learn_more lead records
  leads:*:read         – can read every lead type
  webhook:order_survey – receives webhooks when an order_survey is created
  webhook:learn_more   – receives webhooks when a learn_more lead is created
  webhook:*            – receives every webhook event
"""
from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import Depends, Header, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, ConfigDict, Field

KEY_PREFIX = "gzl_live_"
WEBHOOK_SECRET_PREFIX = "whsec_"


# ----------------------------- Pydantic models -----------------------------
class ConsumerCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str = Field(..., min_length=1, max_length=120)
    scopes: List[str] = Field(default_factory=list)
    webhook_url: Optional[str] = None


class ConsumerPatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    scopes: Optional[List[str]] = None
    webhook_url: Optional[str] = None
    active: Optional[bool] = None


# ----------------------------- Helpers -----------------------------
def generate_api_key() -> str:
    return KEY_PREFIX + secrets.token_urlsafe(32)


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def generate_webhook_secret() -> str:
    return WEBHOOK_SECRET_PREFIX + secrets.token_urlsafe(32)


def has_scope(consumer_scopes: List[str], required: str) -> bool:
    """`leads:*:read` matches `leads:order:read`; `webhook:*` matches `webhook:order_survey`."""
    if required in consumer_scopes:
        return True
    r_parts = required.split(":")
    for s in consumer_scopes:
        s_parts = s.split(":")
        if len(s_parts) != len(r_parts):
            continue
        if all(sp == "*" or sp == rp for sp, rp in zip(s_parts, r_parts)):
            return True
    return False


def public_view(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "name": doc["name"],
        "scopes": doc.get("scopes", []),
        "webhook_url": doc.get("webhook_url"),
        "active": doc.get("active", True),
        "created_at": doc["created_at"],
        "last_used_at": doc.get("last_used_at"),
    }


def reshape_lead(doc: dict) -> dict:
    base = {
        "id": doc["id"],
        "type": doc.get("kind"),
        "submitted_at": doc.get("created_at"),
    }
    if doc.get("kind") == "order_survey":
        base.update(
            {
                "agent": {
                    "name": doc.get("agent_name"),
                    "agency": doc.get("agency_name"),
                    "branch": doc.get("branch") or None,
                    "email": doc.get("email"),
                    "phone": doc.get("phone"),
                },
                "seller": {
                    "name": doc.get("seller_name"),
                    "email": doc.get("seller_email"),
                    "phone": doc.get("seller_phone") or None,
                },
                "property": {
                    "address_line_1": doc.get("address_line_1"),
                    "postcode": doc.get("postcode"),
                    "listing_url": doc.get("listing_url"),
                    "asking_price": doc.get("asking_price") or None,
                },
                "confirmation": bool(doc.get("confirmation")),
            }
        )
    elif doc.get("kind") == "learn_more":
        base.update(
            {
                "agent": {
                    "name": doc.get("full_name"),
                    "agency": doc.get("agency"),
                    "email": doc.get("email"),
                }
            }
        )
    return base


# ----------------------------- Auth dependencies -----------------------------
def _extract_bearer(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header. Expected 'Authorization: Bearer <token>'",
        )
    return authorization[7:].strip()


def require_admin(authorization: Optional[str] = Header(None)) -> None:
    token = _extract_bearer(authorization)
    expected = os.environ["ADMIN_TOKEN"]
    if not secrets.compare_digest(token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin token"
        )


def build_require_consumer(db: AsyncIOMotorDatabase):
    async def _require_consumer(authorization: Optional[str] = Header(None)) -> dict:
        token = _extract_bearer(authorization)
        consumer = await db.api_consumers.find_one({"key_hash": hash_key(token)})
        if not consumer or not consumer.get("active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or revoked API token",
            )
        await db.api_consumers.update_one(
            {"_id": consumer["_id"]},
            {"$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}},
        )
        return consumer

    return _require_consumer


def build_require_scope(db: AsyncIOMotorDatabase):
    require_consumer = build_require_consumer(db)

    def _factory(scope: str):
        async def _check(consumer: dict = Depends(require_consumer)) -> dict:
            if not has_scope(consumer.get("scopes", []), scope):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"API token missing required scope: {scope}",
                )
            return consumer

        return _check

    return _factory
