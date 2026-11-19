"""Internal endpoints for schedulers. Not part of the public or consumer API."""
from __future__ import annotations

import hmac

from fastapi import APIRouter, Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

import pm_survey


def build_internal_router(db: AsyncIOMotorDatabase) -> APIRouter:
    router = APIRouter(prefix="/internal", tags=["internal"])

    @router.post("/rpsa-sync")
    async def rpsa_sync(x_cron_secret: str = Header(default="")):
        """Pull RPSA updates for open survey cases into PM. Run every few hours."""
        if not pm_survey.CRON_SECRET or not hmac.compare_digest(
            x_cron_secret, pm_survey.CRON_SECRET
        ):
            raise HTTPException(status_code=401, detail="Unauthorized")
        return await pm_survey.run_rpsa_sync(db)

    return router
