"""Tests for the ProcessMaker survey case and the RPSA sync (pm_survey.py).

No network and no real database: PM and RPSA calls are replaced, and the
agreements collection is an in-memory mongomock one.
"""
import os
import sys

import pytest
from mongomock_motor import AsyncMongoMockClient

os.environ.setdefault("RESEND_API_KEY", "re_test_key")
os.environ.setdefault("SENDER_EMAIL", "test@example.com")
os.environ.setdefault("NOTIFY_EMAIL", "notify@example.com")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pm_survey  # noqa: E402

PAYLOAD = {
    "GazealReference": "QoXJAX-4L2Q",
    "ClientName": "Bryan Mansell",
    "PropertyPrice": "1620000",
    "seller": {"name": "Bryan Mansell", "email": "b@example.com", "phone": "0771"},
    "property": {"address_line_1": "41 Devonshire Street", "postcode": "W1G 7AJ"},
    "agent": {"name": "Jane", "agency": "Knight", "branch": "Bristol", "email": "j@k.co"},
}


@pytest.fixture
def db():
    return AsyncMongoMockClient()["test"]


@pytest.fixture
def pm_on(monkeypatch):
    for name, value in {
        "PM_BASE_URL": "https://pm.test",
        "PM_CLIENT_ID": "cid",
        "PM_SERVICE_USERNAME": "svc",
        "PM_SURVEY_PRO_UID": "p" * 32,
        "PM_SURVEY_TAS_UID": "t" * 32,
        "RPSA_STATUS_URL": "https://rpsa.test/status",
    }.items():
        monkeypatch.setattr(pm_survey, name, value)


async def _agreement(db, **extra):
    await db.agreements.insert_one({"token": "tok1", **extra})


class TestVariables:
    def test_flag_and_core_fields(self):
        v = pm_survey.build_case_variables(PAYLOAD, "44249")
        assert v[pm_survey.PM_SURVEY_FLAG_VARIABLE] == pm_survey.PM_SURVEY_FLAG_VALUE
        assert v["surveyRpsaRef"] == "44249"
        assert v["surveyGazealRef"] == "QoXJAX-4L2Q"
        assert v["vendorPrimaryClientFirstName"] == "Bryan"
        assert v["vendorPrimaryClientLastName"] == "Mansell"
        assert v["propertyDetailsPostCode"] == "W1G 7AJ"
        assert v["buyerFound"] == "No"

    def test_missing_fields_do_not_crash(self):
        v = pm_survey.build_case_variables({}, None)
        assert v["surveyRpsaRef"] == ""
        assert v["vendorPrimaryClientFirstName"] == ""


class TestRpsaMapping:
    def test_raw_fallback_without_map(self, monkeypatch):
        monkeypatch.setattr(pm_survey, "PM_RPSA_FIELD_MAP", "")
        out = pm_survey.map_rpsa_update({"status": "booked"})
        assert list(out) == [pm_survey.PM_RPSA_RAW_VARIABLE]
        assert '"booked"' in out[pm_survey.PM_RPSA_RAW_VARIABLE]

    def test_field_map_with_dotted_path(self, monkeypatch):
        monkeypatch.setattr(
            pm_survey, "PM_RPSA_FIELD_MAP",
            '{"rpsaStatus": "status", "rpsaDate": "booking.date", "rpsaGone": "nope"}',
        )
        out = pm_survey.map_rpsa_update({"status": "booked", "booking": {"date": "2026-12-01"}})
        assert out == {"rpsaStatus": "booked", "rpsaDate": "2026-12-01"}

    def test_complete_status(self, monkeypatch):
        monkeypatch.setattr(pm_survey, "RPSA_COMPLETE_STATUSES", ["report sent"])
        assert pm_survey.is_complete({"status": "Report Sent"})
        assert not pm_survey.is_complete({"status": "booked"})
        monkeypatch.setattr(pm_survey, "RPSA_COMPLETE_STATUSES", [])
        assert not pm_survey.is_complete({"status": "Report Sent"})


class TestCreateCase:
    async def test_disabled_does_nothing(self, db, monkeypatch):
        monkeypatch.setattr(pm_survey, "PM_BASE_URL", "")
        await _agreement(db)
        await pm_survey.create_survey_case(db, "tok1", PAYLOAD, "1")
        assert "pm_case" not in await db.agreements.find_one({"token": "tok1"})

    async def test_creates_once(self, db, pm_on, monkeypatch):
        calls = []

        async def fake_start(variables):
            calls.append(variables)
            return {"app_uid": "a" * 32, "app_number": 77}

        monkeypatch.setattr(pm_survey, "_start_and_route_case", fake_start)
        await _agreement(db)
        await pm_survey.create_survey_case(db, "tok1", PAYLOAD, "44249")
        await pm_survey.create_survey_case(db, "tok1", PAYLOAD, "44249")  # replay
        assert len(calls) == 1
        doc = await db.agreements.find_one({"token": "tok1"})
        assert doc["pm_case"]["status"] == "created"
        assert doc["pm_case"]["app_number"] == 77
        assert doc["rpsa_sync"] == {"complete": False, "runs": 0}

    async def test_failure_is_recorded_after_three_attempts(self, db, pm_on, monkeypatch):
        async def boom(variables):
            raise RuntimeError("PM down")

        async def no_sleep(_):
            return None

        monkeypatch.setattr(pm_survey, "_start_and_route_case", boom)
        monkeypatch.setattr(pm_survey.asyncio, "sleep", no_sleep)
        await _agreement(db)
        await pm_survey.create_survey_case(db, "tok1", PAYLOAD, "1")
        doc = await db.agreements.find_one({"token": "tok1"})
        assert doc["pm_case"]["status"] == "failed"
        assert doc["pm_case"]["attempts"] == 3
        assert "PM down" in doc["pm_case"]["error"]


def _created_doc(**extra):
    from datetime import datetime, timezone
    return {
        "pm_case": {
            "status": "created",
            "app_uid": "a" * 32,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        "rpsa_sync": {"complete": False, "runs": 0},
        "rpsa_webhook": {"rpsa_id": "44249"},
        **extra,
    }


class TestSync:
    async def test_skipped_when_not_configured(self, db, monkeypatch):
        monkeypatch.setattr(pm_survey, "RPSA_STATUS_URL", "")
        assert "skipped" in await pm_survey.run_rpsa_sync(db)

    async def test_updates_pm_then_skips_unchanged(self, db, pm_on, monkeypatch):
        pushed = []

        async def fake_fetch(rpsa_id):
            assert rpsa_id == "44249"
            return {"status": "booked"}

        async def fake_update(app_uid, variables):
            pushed.append((app_uid, variables))

        monkeypatch.setattr(pm_survey, "_fetch_rpsa_update", fake_fetch)
        monkeypatch.setattr(pm_survey, "_update_case_variables", fake_update)
        await _agreement(db, **_created_doc())

        first = await pm_survey.run_rpsa_sync(db)
        second = await pm_survey.run_rpsa_sync(db)
        assert first["updated"] == 1 and second["unchanged"] == 1
        assert len(pushed) == 1
        doc = await db.agreements.find_one({"token": "tok1"})
        assert doc["rpsa_sync"]["runs"] == 2
        assert doc["rpsa_sync"]["last_response"] == {"status": "booked"}

    async def test_stops_polling_when_complete(self, db, pm_on, monkeypatch):
        async def fake_fetch(_):
            return {"status": "Report Sent"}

        async def fake_update(*_):
            return None

        monkeypatch.setattr(pm_survey, "_fetch_rpsa_update", fake_fetch)
        monkeypatch.setattr(pm_survey, "_update_case_variables", fake_update)
        monkeypatch.setattr(pm_survey, "RPSA_COMPLETE_STATUSES", ["report sent"])
        await _agreement(db, **_created_doc())
        assert (await pm_survey.run_rpsa_sync(db))["completed"] == 1
        assert (await pm_survey.run_rpsa_sync(db))["checked"] == 0

    async def test_one_failure_does_not_stop_the_rest(self, db, pm_on, monkeypatch):
        async def fake_fetch(rpsa_id):
            if rpsa_id == "bad":
                raise RuntimeError("RPSA 500")
            return {"status": "ok"}

        async def fake_update(*_):
            return None

        monkeypatch.setattr(pm_survey, "_fetch_rpsa_update", fake_fetch)
        monkeypatch.setattr(pm_survey, "_update_case_variables", fake_update)
        await db.agreements.insert_one({"token": "t_bad", **_created_doc(rpsa_webhook={"rpsa_id": "bad"})})
        await db.agreements.insert_one({"token": "t_ok", **_created_doc()})
        summary = await pm_survey.run_rpsa_sync(db)
        assert summary["errors"] == 1 and summary["updated"] == 1
        bad = await db.agreements.find_one({"token": "t_bad"})
        assert "RPSA 500" in bad["rpsa_sync"]["last_error"]


class TestCronEndpoint:
    def _client(self, db):
        from fastapi import FastAPI
        from fastapi.testclient import TestClient
        from routes.internal import build_internal_router

        app = FastAPI()
        app.include_router(build_internal_router(db), prefix="/api")
        return TestClient(app)

    def test_rejects_without_secret(self, db, monkeypatch):
        monkeypatch.setattr(pm_survey, "CRON_SECRET", "s3cret")
        client = self._client(db)
        assert client.post("/api/internal/rpsa-sync").status_code == 401
        assert client.post(
            "/api/internal/rpsa-sync", headers={"X-Cron-Secret": "wrong"}
        ).status_code == 401

    def test_rejects_everything_when_no_secret_configured(self, db, monkeypatch):
        monkeypatch.setattr(pm_survey, "CRON_SECRET", "")
        assert self._client(db).post(
            "/api/internal/rpsa-sync", headers={"X-Cron-Secret": ""}
        ).status_code == 401

    def test_runs_with_secret(self, db, monkeypatch):
        monkeypatch.setattr(pm_survey, "CRON_SECRET", "s3cret")
        monkeypatch.setattr(pm_survey, "RPSA_STATUS_URL", "")
        r = self._client(db).post(
            "/api/internal/rpsa-sync", headers={"X-Cron-Secret": "s3cret"}
        )
        assert r.status_code == 200 and "skipped" in r.json()
