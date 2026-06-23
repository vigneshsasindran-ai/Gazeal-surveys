"""Webhook delivery worker — HMAC signing, retry schedule, failure alerting.

Schedule per delivery:
  Attempt 1: immediate
  Attempt 2: +60s if attempt 1 failed
  Attempt 3: +300s if attempt 2 failed

After 3 failures: mark the delivery `failed` and send a single email alert
to NOTIFY_EMAIL so we can chase the consumer. The delivery stays in Mongo
and can be replayed manually via POST /api/v1/admin/deliveries/{id}/replay.

Background tasks are scheduled with asyncio.create_task, which is fine for
the lead volume of a marketing landing page. For higher volume, swap in a
real queue (RQ/Celery/dramatiq).
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
import resend
from motor.motor_asyncio import AsyncIOMotorDatabase

from consumers import has_scope, reshape_lead

logger = logging.getLogger(__name__)

RETRY_SCHEDULE_SECONDS = [0, 60, 300]
HTTP_TIMEOUT = 15.0


# ----------------------------- HMAC signing -----------------------------
def sign_payload(secret: str, timestamp: int, body: bytes) -> str:
    """Stripe-style signature: hmac-sha256 of <timestamp>.<body>."""
    base = f"{timestamp}.".encode() + body
    mac = hmac.new(secret.encode(), base, hashlib.sha256).hexdigest()
    return f"sha256={mac}"


# ----------------------------- Email alert -----------------------------
async def _send_failure_alert(
    consumer: dict, payload: dict, last_error: str, delivery_id: str
) -> None:
    try:
        sender = os.environ["SENDER_EMAIL"]
        notify = os.environ["NOTIFY_EMAIL"]
        html = f"""
        <p>The webhook delivery to <strong>{consumer['name']}</strong>
        has failed after 3 attempts.</p>
        <ul>
          <li><strong>Consumer:</strong> {consumer['name']}</li>
          <li><strong>Webhook URL:</strong> {consumer.get('webhook_url')}</li>
          <li><strong>Event:</strong> {payload['event']}</li>
          <li><strong>Event ID:</strong> {payload['event_id']}</li>
          <li><strong>Last error:</strong> {last_error}</li>
        </ul>
        <p>Once the consumer's endpoint is back up, replay this delivery:</p>
        <pre style="background:#F7F4EE;padding:8px;border-radius:6px;font-size:12px;">
curl -X POST https://YOUR_HOST/api/v1/admin/deliveries/{delivery_id}/replay \\
  -H "Authorization: Bearer $ADMIN_TOKEN"
        </pre>
        """
        params = {
            "from": sender,
            "to": [notify],
            "subject": f"[Gazeal Surveys] Webhook delivery failed — {consumer['name']}",
            "html": html,
        }
        await asyncio.to_thread(resend.Emails.send, params)
    except Exception:
        logger.exception("Failed-delivery alert email itself failed")


# ----------------------------- Delivery -----------------------------
async def _attempt_delivery(
    consumer: dict, body_bytes: bytes, payload: dict
) -> dict:
    timestamp = int(time.time())
    signature = sign_payload(consumer["webhook_secret"], timestamp, body_bytes)
    headers = {
        "Content-Type": "application/json",
        "X-Gazeal-Signature": signature,
        "X-Gazeal-Timestamp": str(timestamp),
        "X-Gazeal-Event": payload["event"],
        "X-Gazeal-Event-Id": payload["event_id"],
        "Idempotency-Key": payload["event_id"],
        "User-Agent": "Gazeal-Surveys-Webhook/1.0",
    }
    attempt = {
        "at": datetime.now(timezone.utc).isoformat(),
        "ok": False,
        "status_code": None,
        "response": None,
        "error": None,
    }
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.post(
                consumer["webhook_url"], content=body_bytes, headers=headers
            )
        attempt["status_code"] = resp.status_code
        attempt["response"] = resp.text[:2000]
        attempt["ok"] = 200 <= resp.status_code < 300
    except Exception as exc:  # noqa: BLE001
        attempt["error"] = str(exc)[:500]
    return attempt


async def _deliver_with_retries(
    db: AsyncIOMotorDatabase,
    delivery_id: str,
    consumer: dict,
    body_bytes: bytes,
    payload: dict,
) -> None:
    last_error = None
    for i, delay in enumerate(RETRY_SCHEDULE_SECONDS):
        if delay:
            await asyncio.sleep(delay)
        attempt_record = await _attempt_delivery(consumer, body_bytes, payload)
        attempt_record["n"] = i + 1
        if attempt_record["ok"]:
            await db.webhook_deliveries.update_one(
                {"id": delivery_id},
                {
                    "$push": {"attempts": attempt_record},
                    "$set": {
                        "status": "delivered",
                        "delivered_at": attempt_record["at"],
                    },
                },
            )
            return
        last_error = (
            attempt_record["error"]
            or f"HTTP {attempt_record['status_code']}"
        )
        await db.webhook_deliveries.update_one(
            {"id": delivery_id},
            {
                "$push": {"attempts": attempt_record},
                "$set": {"status": "retrying", "last_error": last_error},
            },
        )

    await db.webhook_deliveries.update_one(
        {"id": delivery_id},
        {"$set": {"status": "failed", "last_error": last_error}},
    )
    await _send_failure_alert(consumer, payload, last_error or "unknown", delivery_id)


# ----------------------------- Fan-out -----------------------------
async def fan_out(
    db: AsyncIOMotorDatabase, event_name: str, lead_doc: dict
) -> None:
    """Schedule webhook delivery for every active consumer subscribed to this event."""
    required_scope = f"webhook:{lead_doc.get('kind')}"
    consumers = await db.api_consumers.find({"active": True}).to_list(length=500)
    targets = [
        c
        for c in consumers
        if c.get("webhook_url") and has_scope(c.get("scopes", []), required_scope)
    ]
    if not targets:
        return

    event_id = "evt_" + str(uuid.uuid4())
    payload = {
        "event": event_name,
        "event_id": event_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data": reshape_lead(lead_doc),
    }
    body_bytes = json.dumps(payload, separators=(",", ":")).encode()

    for c in targets:
        delivery_id = str(uuid.uuid4())
        await db.webhook_deliveries.insert_one(
            {
                "id": delivery_id,
                "consumer_id": c["id"],
                "consumer_name": c["name"],
                "event": event_name,
                "event_id": event_id,
                "lead_id": lead_doc["id"],
                "webhook_url": c["webhook_url"],
                "status": "pending",
                "attempts": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        asyncio.create_task(
            _deliver_with_retries(db, delivery_id, c, body_bytes, payload)
        )


# ----------------------------- Manual replay -----------------------------
async def replay(db: AsyncIOMotorDatabase, delivery_id: str) -> Optional[bool]:
    delivery = await db.webhook_deliveries.find_one({"id": delivery_id})
    if not delivery:
        return None
    consumer = await db.api_consumers.find_one({"id": delivery["consumer_id"]})
    if not consumer or not consumer.get("active"):
        return None
    lead = await db.leads.find_one({"id": delivery["lead_id"]})
    if not lead:
        return None

    payload = {
        "event": delivery["event"],
        "event_id": delivery["event_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data": reshape_lead(lead),
    }
    body_bytes = json.dumps(payload, separators=(",", ":")).encode()

    await db.webhook_deliveries.update_one(
        {"id": delivery_id},
        {
            "$set": {
                "status": "pending",
                "replayed_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    asyncio.create_task(
        _deliver_with_retries(db, delivery_id, consumer, body_bytes, payload)
    )
    return True
