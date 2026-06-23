"""Admin endpoints for managing API consumers and webhook deliveries.

All routes here require the ADMIN_TOKEN env var as a bearer token. They are
deliberately not visible to consumers themselves.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from consumers import (
    ConsumerCreate,
    ConsumerPatch,
    generate_api_key,
    generate_webhook_secret,
    hash_key,
    public_view,
    require_admin,
)
from webhooks import replay as replay_delivery


def build_admin_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(
        prefix="/v1/admin",
        tags=["admin"],
        dependencies=[Depends(require_admin)],
    )

    # --- Consumers ---
    @router.post("/consumers")
    async def create_consumer(payload: ConsumerCreate):
        api_key = generate_api_key()
        webhook_secret = generate_webhook_secret()
        doc = {
            "id": str(uuid.uuid4()),
            "name": payload.name,
            "scopes": payload.scopes,
            "webhook_url": payload.webhook_url,
            "webhook_secret": webhook_secret,
            "key_hash": hash_key(api_key),
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_used_at": None,
        }
        await db.api_consumers.insert_one(doc)
        return {
            **public_view(doc),
            "api_key": api_key,
            "webhook_secret": webhook_secret,
            "_note": "Store api_key and webhook_secret now. They are not retrievable later.",
        }

    @router.get("/consumers")
    async def list_consumers():
        docs = await db.api_consumers.find().to_list(length=500)
        return [public_view(d) for d in docs]

    @router.get("/consumers/{consumer_id}")
    async def get_consumer(consumer_id: str):
        doc = await db.api_consumers.find_one({"id": consumer_id})
        if not doc:
            raise HTTPException(404, "Consumer not found")
        return public_view(doc)

    @router.patch("/consumers/{consumer_id}")
    async def patch_consumer(consumer_id: str, payload: ConsumerPatch):
        updates = {
            k: v
            for k, v in payload.model_dump(exclude_unset=True).items()
            if v is not None
        }
        if not updates:
            raise HTTPException(400, "No fields to update")
        res = await db.api_consumers.update_one({"id": consumer_id}, {"$set": updates})
        if res.matched_count == 0:
            raise HTTPException(404, "Consumer not found")
        doc = await db.api_consumers.find_one({"id": consumer_id})
        return public_view(doc)

    @router.post("/consumers/{consumer_id}/rotate")
    async def rotate_consumer_key(consumer_id: str):
        api_key = generate_api_key()
        webhook_secret = generate_webhook_secret()
        res = await db.api_consumers.update_one(
            {"id": consumer_id},
            {
                "$set": {
                    "key_hash": hash_key(api_key),
                    "webhook_secret": webhook_secret,
                }
            },
        )
        if res.matched_count == 0:
            raise HTTPException(404, "Consumer not found")
        doc = await db.api_consumers.find_one({"id": consumer_id})
        return {
            **public_view(doc),
            "api_key": api_key,
            "webhook_secret": webhook_secret,
        }

    @router.delete("/consumers/{consumer_id}")
    async def delete_consumer(consumer_id: str):
        res = await db.api_consumers.delete_one({"id": consumer_id})
        if res.deleted_count == 0:
            raise HTTPException(404, "Consumer not found")
        return {"status": "deleted"}

    # --- Webhook deliveries ---
    @router.get("/deliveries")
    async def list_deliveries(
        consumer_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = Query(50, ge=1, le=200),
    ):
        q: dict = {}
        if consumer_id:
            q["consumer_id"] = consumer_id
        if status:
            q["status"] = status
        rows = (
            await db.webhook_deliveries.find(q)
            .sort("created_at", -1)
            .limit(limit)
            .to_list(length=limit)
        )
        for r in rows:
            r.pop("_id", None)
        return rows

    @router.post("/deliveries/{delivery_id}/replay")
    async def replay(delivery_id: str):
        ok = await replay_delivery(db, delivery_id)
        if not ok:
            raise HTTPException(
                404, "Delivery not found, consumer inactive, or lead missing"
            )
        return {"status": "scheduled"}

    return router
