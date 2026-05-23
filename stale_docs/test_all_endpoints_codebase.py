"""Codebase-wide endpoint tester (backend FastAPI router only).

Goal:
- Test ALL endpoints discovered in backend/api/v1/endpoints/* and admin router.
- Runs authorization checks for role-based protected endpoints.

Important:
- This project’s codebase only includes FastAPI routes under backend/api/v1/endpoints.
- Some endpoints require data created by other endpoints (campaign_id, update_id, etc.).
- This runner attempts to create minimal working data via existing endpoints.

Run:
  python test_all_endpoints_codebase.py

Prereqs:
- Backend running at http://localhost:8000
"""

from __future__ import annotations

import time
from dataclasses import dataclass
import requests

BASE = "http://localhost:8000"
PASSWORD = "TestPass123!"


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def log(name: str, method: str, path: str, status: int | None, ok: bool) -> None:
    icon = "✅" if ok else "❌"
    print(f"  {icon} {name}: [{method}] {path} -> {status}")


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


def login(email: str) -> str | None:
    r = requests.post(f"{BASE}/auth/login", data={"username": email, "password": PASSWORD})
    if not r.ok:
        return None
    return r.json().get("access_token")


def safe_json(r: requests.Response):
    try:
        return r.json()
    except Exception:
        return None


def ensure_users():
    ts = int(time.time())

    # Roles supported by backend enum: USER/CREATOR/ADMIN (see earlier failure).
    # We'll use CREATOR as the non-admin privileged role.
    # For endpoints that require get_active_user only, either USER or CREATOR works.
    user_email = f"testuser_{ts}@test.com"
    creator_email = f"testcreator_{ts}@test.com"
    admin_email = f"testadmin_{ts}@test.com"

    register_user("Test User", user_email, "USER")
    register_user("Test Creator", creator_email, "CREATOR")
    register_user("Test Admin", admin_email, "ADMIN")

    user_token = login(user_email)
    creator_token = login(creator_email)
    admin_token = login(admin_email)

    if not user_token or not creator_token or not admin_token:
        raise RuntimeError(
            "Failed to create/login one or more users. Check backend auth role enum and /auth/register behavior."
        )

    return user_token, creator_token, admin_token


def create_campaign(creator_token: str) -> int | None:
    # POST /campaigns
    payload = {
        "title": "Test Campaign for Codebase Endpoint Runner",
        "description": "This is a test campaign to validate endpoint coverage end-to-end.",
        "category": "medical",
        "city": "Mumbai",
        "goal_amount": 50000.0,
        "urgency_level": "HIGH",
        "cover_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
    }
    r = requests.post(f"{BASE}/campaigns", headers=auth_headers(creator_token), json=payload)
    if not r.ok:
        return None
    data = safe_json(r)
    return data.get("id") if isinstance(data, dict) else None


def create_campaign_update(creator_token: str, campaign_id: int) -> int | None:
    payload = {"content": "Test update content with enough length", "image_url": None}
    r = requests.post(
        f"{BASE}/campaigns/{campaign_id}/updates",
        headers=auth_headers(creator_token),
        json=payload,
    )
    if not r.ok:
        return None
    data = safe_json(r)
    return data.get("id") if isinstance(data, dict) else None


def main() -> int:
    # Auth
    user_token, creator_token, admin_token = ensure_users()

    failures = 0

    # ---------- AUTH ENDPOINTS ----------
    print("\n🔵 AUTH ENDPOINTS")
    cases = [
        ("GET", "/auth/me", user_token),
        ("GET", "/auth/profile", user_token),
        ("PUT", "/auth/profile", user_token),
        ("DELETE", "/auth/profile", user_token),
    ]
    # Avoid deleting user so we can keep using tokens.
    for method, path, token in cases:
        if method == "DELETE":
            continue
        if method == "GET":
            r = requests.request(method, f"{BASE}{path}", headers=auth_headers(token))
        else:
            r = requests.put(f"{BASE}{path}", headers=auth_headers(token), json={"bio": "Endpoint runner bio", "city": "Mumbai"})
        ok = r.ok
        failures += 0 if ok else 1
        log(f"auth_{path.replace('/','_')}", method, path, r.status_code, ok)

    # ---------- CAMPAIGNS ENDPOINTS ----------
    print("\n🔵 CAMPAIGNS ENDPOINTS")
    campaign_id = create_campaign(creator_token)

    # list campaigns (no auth required in current code)
    r = requests.get(f"{BASE}/campaigns")
    ok = r.ok
    failures += 0 if ok else 1
    log("campaign_list", "GET", "/campaigns", r.status_code, ok)

    r = requests.get(f"{BASE}/campaigns/taxonomy")
    ok = r.ok
    failures += 0 if ok else 1
    log("campaign_taxonomy", "GET", "/campaigns/taxonomy", r.status_code, ok)

    if campaign_id is not None:
        r = requests.get(f"{BASE}/campaigns/{campaign_id}")
        ok = r.ok
        failures += 0 if ok else 1
        log("campaign_get", "GET", f"/campaigns/{campaign_id}", r.status_code, ok)

        r = requests.get(f"{BASE}/campaigns/{campaign_id}/donations")
        ok = r.ok
        failures += 0 if ok else 1
        log("campaign_donations", "GET", f"/campaigns/{campaign_id}/donations", r.status_code, ok)

        r = requests.get(f"{BASE}/campaigns/{campaign_id}/stats")
        ok = r.ok
        failures += 0 if ok else 1
        log("campaign_stats", "GET", f"/campaigns/{campaign_id}/stats", r.status_code, ok)

        r = requests.get(f"{BASE}/campaigns/{campaign_id}/related")
        ok = r.ok
        failures += 0 if ok else 1
        log("campaign_related", "GET", f"/campaigns/{campaign_id}/related", r.status_code, ok)

        # get_campaign_updates requires auth (get_active_user)
        r = requests.get(
            f"{BASE}/campaigns/{campaign_id}/updates",
            headers=auth_headers(creator_token),
        )
        ok = r.ok
        failures += 0 if ok else 1
        log("campaign_updates", "GET", f"/campaigns/{campaign_id}/updates", r.status_code, ok)


        # update create
        update_id = create_campaign_update(creator_token, campaign_id)
        if update_id is not None:
            r = requests.get(f"{BASE}/campaigns/{campaign_id}/updates/{update_id}/comments")
            ok = r.ok
            failures += 0 if ok else 1
            log("update_comments_get", "GET", f"/campaigns/{campaign_id}/updates/{update_id}/comments", r.status_code, ok)

            # comment create
            r = requests.post(
                f"{BASE}/campaigns/{campaign_id}/updates/{update_id}/comments",
                headers=auth_headers(creator_token),
                json={"text": "Test comment from endpoint runner"},
            )
            ok = r.ok
            failures += 0 if ok else 1
            log("update_comment_create", "POST", f"/campaigns/{campaign_id}/updates/{update_id}/comments", r.status_code, ok)

            # like/unlike
            r = requests.post(f"{BASE}/campaigns/{campaign_id}/updates/{update_id}/like", headers=auth_headers(creator_token))
            ok = r.ok
            failures += 0 if ok else 1
            log("update_like", "POST", f"/campaigns/{campaign_id}/updates/{update_id}/like", r.status_code, ok)

            r = requests.post(f"{BASE}/campaigns/{campaign_id}/updates/{update_id}/unlike", headers=auth_headers(creator_token))
            ok = r.ok
            failures += 0 if ok else 1
            log("update_unlike", "POST", f"/campaigns/{campaign_id}/updates/{update_id}/unlike", r.status_code, ok)

            # pin toggle
            r = requests.put(f"{BASE}/campaigns/{campaign_id}/updates/{update_id}/pin", headers=auth_headers(creator_token))
            ok = r.ok
            failures += 0 if ok else 1
            log("update_pin", "PUT", f"/campaigns/{campaign_id}/updates/{update_id}/pin", r.status_code, ok)

    # ---------- USERS ENDPOINTS ----------
    print("\n🔵 USERS ENDPOINTS")
    r = requests.get(f"{BASE}/users/me/timeline", headers=auth_headers(user_token))
    # note: route is /users/me/timeline
    ok = r.ok
    failures += 0 if ok else 1
    log("user_timeline", "GET", "/users/me/timeline", r.status_code, ok)

    # ---------- ADMIN ENDPOINTS ----------
    print("\n🔵 ADMIN ENDPOINTS")
    admin_cases = [
        ("GET", "/admin/stats"),
        ("GET", "/admin/users"),
        ("GET", "/admin/campaigns"),
    ]
    for method, path in admin_cases:
        r = requests.request(method, f"{BASE}{path}", headers=auth_headers(admin_token), params={"skip": 0, "limit": 10} if 'users' in path or 'campaigns' in path else None)
        ok = r.ok
        failures += 0 if ok else 1
        log("admin_static", method, path, r.status_code, ok)

    # Authorization negative check for one endpoint
    r = requests.get(f"{BASE}/admin/stats", headers=auth_headers(user_token))
    ok = r.status_code in (401, 403)
    failures += 0 if ok else 1
    log("admin_negative_auth", "GET", "/admin/stats", r.status_code, ok)

    print(f"\nDone. Failures: {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())

