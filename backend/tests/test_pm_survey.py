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


INSTRUCTION = {
    "rpsaref": 44249, "reference": "QoXJAX-4L2Q", "booked": "Y",
    "surveydate": "2026-12-01", "reportreceived": "N",
    "reportreceiveddate": "0000-00-00", "reporturl": "",
    "completed": "N", "completeddate": "0000-00-00",
}


class TestRpsaMapping:
    def test_default_map_and_zero_dates(self, monkeypatch):
        monkeypatch.setattr(pm_survey, "PM_RPSA_FIELD_MAP", "")
        out = pm_survey.map_rpsa_update(INSTRUCTION)
        assert out["rpsaBooked"] == "Y"
        assert out["rpsaSurveyDate"] == "2026-12-01"
        assert out["rpsaReportReceivedDate"] == ""  # 0000-00-00 becomes empty
        assert out["rpsaCompleted"] == "N"

    def test_env_map_overrides_default(self, monkeypatch):
        monkeypatch.setattr(
            pm_survey, "PM_RPSA_FIELD_MAP",
            '{"surveyStatus": "completed", "gone": "nope"}',
        )
        assert pm_survey.map_rpsa_update(INSTRUCTION) == {"surveyStatus": "N"}

    def test_raw_fallback_when_nothing_maps(self, monkeypatch):
        monkeypatch.setattr(pm_survey, "PM_RPSA_FIELD_MAP", '{"x": "nope"}')
        out = pm_survey.map_rpsa_update(INSTRUCTION)
        assert list(out) == [pm_survey.PM_RPSA_RAW_VARIABLE]

    def test_complete_when_completed_is_y(self):
        assert pm_survey.is_complete({**INSTRUCTION, "completed": "Y"})
        assert pm_survey.is_complete({**INSTRUCTION, "completed": "y"})
        assert not pm_survey.is_complete(INSTRUCTION)


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

    async def test_one_fetch_updates_pm_then_skips_unchanged(self, db, pm_on, monkeypatch):
        pushed, fetches = [], []

        async def fake_fetch():
            fetches.append(1)
            return {"44249": INSTRUCTION, "1": {"rpsaref": 1}}

        async def fake_update(app_uid, variables):
            pushed.append((app_uid, variables))

        monkeypatch.setattr(pm_survey, "_fetch_rpsa_instructions", fake_fetch)
        monkeypatch.setattr(pm_survey, "_update_case_variables", fake_update)
        await _agreement(db, **_created_doc())
        await db.agreements.insert_one({"token": "t2", **_created_doc(rpsa_webhook={"rpsa_id": "1"})})

        first = await pm_survey.run_rpsa_sync(db)
        second = await pm_survey.run_rpsa_sync(db)
        assert first["updated"] == 2 and second["unchanged"] == 2
        assert len(fetches) == 2          # one fetch per run, not one per case
        assert len(pushed) == 2
        doc = await db.agreements.find_one({"token": "tok1"})
        assert doc["rpsa_sync"]["runs"] == 2
        assert pushed[0][1]["rpsaSurveyDate"] == "2026-12-01"

    async def test_stops_polling_when_completed(self, db, pm_on, monkeypatch):
        async def fake_fetch():
            return {"44249": {**INSTRUCTION, "completed": "Y"}}

        async def fake_update(*_):
            return None

        monkeypatch.setattr(pm_survey, "_fetch_rpsa_instructions", fake_fetch)
        monkeypatch.setattr(pm_survey, "_update_case_variables", fake_update)
        await _agreement(db, **_created_doc())
        assert (await pm_survey.run_rpsa_sync(db))["completed"] == 1
        assert (await pm_survey.run_rpsa_sync(db))["checked"] == 0

    async def test_case_missing_from_rpsa_list(self, db, pm_on, monkeypatch):
        async def fake_fetch():
            return {"999": {"rpsaref": 999}}

        monkeypatch.setattr(pm_survey, "_fetch_rpsa_instructions", fake_fetch)
        await _agreement(db, **_created_doc())
        assert (await pm_survey.run_rpsa_sync(db))["not_found"] == 1
        doc = await db.agreements.find_one({"token": "tok1"})
        assert "Not in RPSA" in doc["rpsa_sync"]["last_error"]

    async def test_rpsa_down_is_reported_and_nothing_written(self, db, pm_on, monkeypatch):
        async def boom():
            raise RuntimeError("RPSA 500")

        monkeypatch.setattr(pm_survey, "_fetch_rpsa_instructions", boom)
        await _agreement(db, **_created_doc())
        summary = await pm_survey.run_rpsa_sync(db)
        assert summary["errors"] == 1 and "RPSA 500" in summary["error"]

    async def test_one_pm_failure_does_not_stop_the_rest(self, db, pm_on, monkeypatch):
        async def fake_fetch():
            return {"44249": INSTRUCTION, "7": {"rpsaref": 7}}

        async def fake_update(app_uid, variables):
            if app_uid == "b" * 32:
                raise RuntimeError("PM 500")

        monkeypatch.setattr(pm_survey, "_fetch_rpsa_instructions", fake_fetch)
        monkeypatch.setattr(pm_survey, "_update_case_variables", fake_update)
        bad = _created_doc(rpsa_webhook={"rpsa_id": "7"})
        bad["pm_case"]["app_uid"] = "b" * 32
        await db.agreements.insert_one({"token": "t_bad", **bad})
        await db.agreements.insert_one({"token": "t_ok", **_created_doc()})
        summary = await pm_survey.run_rpsa_sync(db)
        assert summary["errors"] == 1 and summary["updated"] == 1
        assert "PM 500" in (await db.agreements.find_one({"token": "t_bad"}))["rpsa_sync"]["last_error"]


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
