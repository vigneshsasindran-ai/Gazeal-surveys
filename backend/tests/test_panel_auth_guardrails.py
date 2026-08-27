"""Admin panel auth guardrails (env-driven single admin, JWT bearer)."""
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or frontend_env["REACT_APP_BACKEND_URL"]).rstrip("/")
LOGIN = f"{BASE_URL}/api/panel/auth/login"


def test_brute_force_lockout_after_five_failures():
    probe_user = "qa_lockout_probe"
    codes = []
    for _ in range(6):
        r = requests.post(LOGIN, json={"username": probe_user, "password": "wrong-pass"})
        codes.append(r.status_code)
    assert codes[:5] == [401] * 5, codes
    assert codes[5] == 429, f"expected lockout on 6th attempt, got {codes}"


def test_bad_bearer_rejected():
    r = requests.get(f"{BASE_URL}/api/panel/leads", headers={"Authorization": "Bearer not.a.jwt"})
    assert r.status_code == 401


def test_valid_login_returns_jwt():
    from pathlib import Path
    import re
    c = Path("/app/memory/test_credentials.md").read_text(encoding="utf-8")
    u = re.search(r"(?im)^\s*[-*]?\s*(?:\*\*)?Username(?:\*\*)?\s*:\s*`?([^`\s]+)", c)
    p = re.search(r"(?im)^\s*[-*]?\s*(?:\*\*)?Password(?:\*\*)?\s*:\s*`?([^`\s]+)", c)
    if not u or not p:
        pytest.skip("creds missing")
    r = requests.post(LOGIN, json={"username": u.group(1), "password": p.group(1)})
    assert r.status_code == 200, r.text
    d = r.json()
    assert isinstance(d.get("token"), str) and d["token"].count(".") == 2
    assert d.get("expires_in_hours") == 12
