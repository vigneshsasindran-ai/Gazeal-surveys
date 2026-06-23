"""Consumer-facing v1 API.

  GET /api/v1/health          – unauthenticated health probe
  GET /api/v1/guide           – integrator markdown guide
  GET /api/v1/leads           – list leads (scoped per consumer)
  GET /api/v1/leads/{id}      – fetch one (scoped per consumer)
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from consumers import build_require_consumer, has_scope, reshape_lead


# kind -> scope component
_KIND_SCOPE = {
    "order_survey": "order",
    "learn_more": "learn",
}


def _allowed_kinds(consumer: dict) -> list[str]:
    scopes = consumer.get("scopes", [])
    out = []
    for kind, scope_part in _KIND_SCOPE.items():
        if has_scope(scopes, f"leads:{scope_part}:read"):
            out.append(kind)
    return out


def build_consumer_api_router(
    db: AsyncIOMotorDatabase, guide_path: Path
) -> APIRouter:
    router = APIRouter(prefix="/v1", tags=["consumer-api"])
    require_consumer = build_require_consumer(db)

    @router.get("/health")
    async def health():
        return {"status": "ok"}

    @router.get("/guide", response_class=PlainTextResponse)
    async def guide():
        if not guide_path.exists():
            raise HTTPException(404, "Integrator guide not found")
        return guide_path.read_text(encoding="utf-8")

    @router.get("/leads")
    async def list_leads(
        type: Optional[str] = Query(
            None,
            description="Filter by lead type: order_survey or learn_more",
        ),
        since: Optional[str] = Query(
            None,
            description="ISO 8601 timestamp. Only return leads created after this time.",
        ),
        limit: int = Query(50, ge=1, le=200),
        cursor: Optional[str] = Query(
            None,
            description="Cursor returned from the previous page (paginate older).",
        ),
        consumer: dict = Depends(require_consumer),
    ):
        allowed = _allowed_kinds(consumer)
        if not allowed:
            raise HTTPException(
                403, "Token has no `leads:*:read` scopes"
            )

        if type:
            if type not in allowed:
                raise HTTPException(
                    403,
                    f"Token does not have `leads:{_KIND_SCOPE.get(type, type)}:read`",
                )
            kind_filter = [type]
        else:
            kind_filter = allowed

        q: dict = {"kind": {"$in": kind_filter}}
        time_q: dict = {}
        if since:
            time_q["$gte"] = since
        if cursor:
            time_q["$lt"] = cursor
        if time_q:
            q["created_at"] = time_q

        docs = (
            await db.leads.find(q)
            .sort("created_at", -1)
            .limit(limit)
            .to_list(length=limit)
        )
        return {
            "data": [reshape_lead(d) for d in docs],
            "count": len(docs),
            "next_cursor": docs[-1]["created_at"] if len(docs) == limit else None,
        }

    @router.get("/leads/{lead_id}")
    async def get_lead(lead_id: str, consumer: dict = Depends(require_consumer)):
        doc = await db.leads.find_one({"id": lead_id})
        if not doc:
            raise HTTPException(404, "Lead not found")
        scope_part = _KIND_SCOPE.get(doc.get("kind"), "")
        if not scope_part or not has_scope(
            consumer.get("scopes", []), f"leads:{scope_part}:read"
        ):
            raise HTTPException(
                403, "Token cannot read this lead type"
            )
        return reshape_lead(doc)

    return router
