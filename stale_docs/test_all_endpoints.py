"""Admin endpoint test runner (codebase-wide discovery is limited to backend FastAPI router).

Purpose:
- Test all discovered /admin/* endpoints.
- Auth: creates a non-admin and an admin user and validates authorization.

Run:
  python test_all_endpoints.py

Prereqs:
- Backend running at http://localhost:8000
- /auth/register and /auth/login work
"""

from __future__ import annotations

import time
import requests

BASE = "http://localhost:8000"
PASSWORD = "TestPass123!"


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def login(email: str, password: str) -> str | None:
    r = requests.post(f"{BASE}/auth/login", data={"username": email, "password": password})
    if not r.ok:
        return None
    return r.json().get("access_token")


def register_user(name: str, email: str, role: str) -> requests.Response:
    return requests.post(
        f"{BASE}/auth/register",
        json={
            "name": name,
            "email": email,
            "password": PASSWORD,
            "role": role,
            "city": "Mumbai",
            "phone": "9999999999",
        },
    )


def get_any_active_campaign_id(req_token: str) -> int | None:
    # /campaigns is not admin-only and should return ACTIVE/COMPLETED.
    r = requests.get(
        f"{BASE}/campaigns",
        headers=auth_headers(req_token),
        params={"skip": 0, "limit": 1},
    )
    if not r.ok:
        return None
    data = r.json()
    if isinstance(data, list) and data:
        return data[0].get("id")
    return None


def main() -> int:
    ts = int(time.time())

    # Create users with roles allowed by backend enum: USER/CREATOR/ADMIN.
    # Some older test files used REQUESTER/VENDOR; current backend expects USER/CREATOR/ADMIN.
    non_admin_email = f"testuser_{ts}@test.com"
    creator_email = f"testcreator_{ts}@test.com"
    admin_email = f"testadmin_{ts}@test.com"

    # Prefer CREATOR for non-admin flows since some endpoints require a 'created_by' relationship.
    register_user("Test User", non_admin_email, "USER")
    non_admin_token = login(non_admin_email, PASSWORD)

    register_user("Test Creator", creator_email, "CREATOR")
    creator_token = login(creator_email, PASSWORD)

    register_user("Test Admin", admin_email, "ADMIN")
    admin_token = login(admin_email, PASSWORD)

    # Use creator_token if USER login failed.
    if not non_admin_token:
        non_admin_token = creator_token


    if not non_admin_token or not admin_token:
        raise RuntimeError("Failed to create/login test users. Check backend logs and auth role enum.")

    failures = 0

    # Discovered endpoints in backend/api/v1/endpoints/admin.py
    endpoints_static = [
        ("GET", "/admin/stats", None),
        ("GET", "/admin/users", {"skip": 0, "limit": 10}),
        ("GET", "/admin/campaigns", {"skip": 0, "limit": 10}),
    ]

    print("\n🔵 Negative auth tests (non-admin)")
    for method, path, params in endpoints_static:
        r = requests.request(method, f"{BASE}{path}", headers=auth_headers(non_admin_token), params=params)
        ok = r.status_code in (401, 403)
        failures += 0 if ok else 1
        print(f"  {'✅' if ok else '❌'} [{method}] {path} -> {r.status_code} (expected 401/403)")

    campaign_id = get_any_active_campaign_id(non_admin_token)

    if campaign_id is not None:
        print("\n🔵 Negative auth tests (campaign-id endpoints, non-admin)")
        neg_campaign = [
            ("PUT", f"/admin/campaigns/{campaign_id}/verify", {"verified": "true"}),
            ("PUT", f"/admin/campaigns/{campaign_id}/flag", {"flagged": "true"}),
            ("DELETE", f"/admin/campaigns/{campaign_id}", None),
        ]
        for method, path, params in neg_campaign:
            r = requests.request(method, f"{BASE}{path}", headers=auth_headers(non_admin_token), params=params)
            ok = r.status_code in (401, 403)
            failures += 0 if ok else 1
            print(f"  {'✅' if ok else '❌'} [{method}] {path} -> {r.status_code} (expected 401/403)")

    print("\n🟢 Positive auth tests (admin)")
    for method, path, params in endpoints_static:
        r = requests.request(method, f"{BASE}{path}", headers=auth_headers(admin_token), params=params)
        ok = r.ok
        failures += 0 if ok else 1
        print(f"  {'✅' if ok else '❌'} [{method}] {path} -> {r.status_code}")

    if campaign_id is not None:
        pos_campaign = [
            ("PUT", f"/admin/campaigns/{campaign_id}/verify", {"verified": "true"}),
            ("PUT", f"/admin/campaigns/{campaign_id}/flag", {"flagged": "true"}),
            ("DELETE", f"/admin/campaigns/{campaign_id}", None),
        ]
        for method, path, params in pos_campaign:
            r = requests.request(method, f"{BASE}{path}", headers=auth_headers(admin_token), params=params)
            ok = r.ok
            failures += 0 if ok else 1
            print(f"  {'✅' if ok else '❌'} [{method}] {path} -> {r.status_code}")
    else:
        print("\n⚠️ No campaigns found; skipping campaign-id positive tests.")

    print(f"\nDone. Failures: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

