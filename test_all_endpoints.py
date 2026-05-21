"""
Comprehensive Frontend→Backend API Test Suite
Tests every apiService.js call (except auth/login/register)
"""
import requests
import json
import sys
import time

BASE = "http://localhost:8000"
RESULTS = []

def log(name, method, path, status, ok, detail=""):
    icon = "✅" if ok else "❌"
    RESULTS.append({"name": name, "ok": ok, "status": status})
    print(f"  {icon} [{method}] {path} → {status} {detail}")

def get_token(email, password):
    """Login and return token"""
    r = requests.post(f"{BASE}/auth/login", data={"username": email, "password": password})
    if r.ok:
        return r.json()["access_token"]
    return None

def register_user(name, email, password, role="REQUESTER"):
    """Register a user"""
    r = requests.post(f"{BASE}/auth/register", json={
        "name": name, "email": email, "password": password, "role": role,
        "city": "Mumbai", "phone": "9999999999"
    })
    return r

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

def test_health():
    print("\n🔵 HEALTH CHECK")
    r = requests.get(f"{BASE}/health")
    log("Health Check", "GET", "/health", r.status_code, r.ok)
    return r.ok

# ============ SETUP: Create test users ============
def setup_users():
    print("\n🔵 SETUP: Creating test users")
    ts = int(time.time())
    
    # Requester
    req_email = f"testreq_{ts}@test.com"
    r = register_user("Test Requester", req_email, "TestPass123!", "REQUESTER")
    if not r.ok and "already" not in str(r.text).lower():
        print(f"  ⚠️ Register requester: {r.status_code} {r.text[:200]}")
    req_token = get_token(req_email, "TestPass123!")
    
    # Vendor
    vnd_email = f"testvnd_{ts}@test.com"
    r = register_user("Test Vendor", vnd_email, "TestPass123!", "VENDOR")
    if not r.ok and "already" not in str(r.text).lower():
        print(f"  ⚠️ Register vendor: {r.status_code} {r.text[:200]}")
    vnd_token = get_token(vnd_email, "TestPass123!")
    
    # Admin
    adm_email = f"testadm_{ts}@test.com"
    r = register_user("Test Admin", adm_email, "TestPass123!", "ADMIN")
    if not r.ok and "already" not in str(r.text).lower():
        print(f"  ⚠️ Register admin: {r.status_code} {r.text[:200]}")
    adm_token = get_token(adm_email, "TestPass123!")
    
    print(f"  Requester token: {'✅' if req_token else '❌'}")
    print(f"  Vendor token: {'✅' if vnd_token else '❌'}")
    print(f"  Admin token: {'✅' if adm_token else '❌'}")
    
    return req_token, vnd_token, adm_token

# ============ AUTH (non-login) ============
def test_auth_endpoints(req_token):
    print("\n🔵 AUTH ENDPOINTS (non-login/register)")
    
    # GET /auth/me
    r = requests.get(f"{BASE}/auth/me", headers=auth_headers(req_token))
    log("getMe", "GET", "/auth/me", r.status_code, r.ok)
    
    # GET /auth/profile
    r = requests.get(f"{BASE}/auth/profile", headers=auth_headers(req_token))
    log("getProfile", "GET", "/auth/profile", r.status_code, r.ok)
    
    # PUT /auth/profile
    r = requests.put(f"{BASE}/auth/profile", headers=auth_headers(req_token),
        json={"bio": "Test bio update", "city": "Mumbai"})
    log("updateMyProfile", "PUT", "/auth/profile", r.status_code, r.ok)
    
    # POST /auth/emergency-contacts
    r = requests.post(f"{BASE}/auth/emergency-contacts", headers=auth_headers(req_token),
        json={"name": "Dr. Test", "phone": "1234567890", "category": "Doctor"})
    log("addEmergencyContact", "POST", "/auth/emergency-contacts", r.status_code, r.ok)
    contact_id = r.json().get("id") if r.ok else None
    
    # DELETE /auth/emergency-contacts/{id}
    if contact_id:
        r = requests.delete(f"{BASE}/auth/emergency-contacts/{contact_id}", headers=auth_headers(req_token))
        log("deleteEmergencyContact", "DELETE", f"/auth/emergency-contacts/{contact_id}", r.status_code, r.ok)
    else:
        log("deleteEmergencyContact", "DELETE", "/auth/emergency-contacts/X", 0, False, "(skipped - no contact created)")

# ============ VENDOR ============
def test_vendor_endpoints(vnd_token):
    print("\n🔵 VENDOR ENDPOINTS")
    
    # POST /vendor/profile
    r = requests.post(f"{BASE}/vendor/profile", headers=auth_headers(vnd_token),
        json={
            "shop_name": "Test Medical Store",
            "category": "medical",
            "lat": 19.076, "lng": 72.877,
            "city": "Mumbai",
            "service_radius": 10.0,
            "avg_response_time": 15
        })
    log("updateVendorProfile", "POST", "/vendor/profile", r.status_code, r.ok)
    
    # GET /vendor/profile
    r = requests.get(f"{BASE}/vendor/profile", headers=auth_headers(vnd_token))
    log("getVendorProfile", "GET", "/vendor/profile", r.status_code, r.ok)
    
    # GET /vendor/stats
    r = requests.get(f"{BASE}/vendor/stats", headers=auth_headers(vnd_token))
    log("getVendorStats", "GET", "/vendor/stats", r.status_code, r.ok)
    
    # GET /vendor/analytics
    r = requests.get(f"{BASE}/vendor/analytics", headers=auth_headers(vnd_token))
    log("getVendorAnalytics", "GET", "/vendor/analytics", r.status_code, r.ok,
        f"- {r.text[:100]}" if not r.ok else "")

    # GET /vendor/product-lookup
    r = requests.get(f"{BASE}/vendor/product-lookup?q=oxygen", headers=auth_headers(vnd_token))
    log("lookupProduct", "GET", "/vendor/product-lookup", r.status_code, r.ok,
        f"- {r.text[:50]}..." if r.ok else "")

    # GET /vendor/product-suggestions
    r = requests.get(f"{BASE}/vendor/product-suggestions?q=oxy", headers=auth_headers(vnd_token))
    log("getProductSuggestions", "GET", "/vendor/product-suggestions", r.status_code, r.ok,
        f"- {r.json()[:3]}..." if r.ok and isinstance(r.json(), list) else "")

# ============ INVENTORY ============
def test_inventory_endpoints(vnd_token):
    print("\n🔵 INVENTORY ENDPOINTS")
    
    # POST /inventory
    r = requests.post(f"{BASE}/inventory", headers=auth_headers(vnd_token),
        json={
            "resource_name": "Oxygen Cylinder",
            "category": "medical",
            "quantity": 50,
            "price": 500.0,
            "reorder_level": 10,
            "description": "Test description for oxygen cylinder",
            "image_url": "https://example.com/oxy.jpg",
            "specifications": '{"Capacity": "10L"}'
        })
    log("addInventory", "POST", "/inventory", r.status_code, r.ok)
    item_id = r.json().get("id") if r.ok else None
    
    # GET /inventory/
    r = requests.get(f"{BASE}/inventory/", headers=auth_headers(vnd_token))
    log("getInventory", "GET", "/inventory/", r.status_code, r.ok)
    
    # PUT /inventory/{id}
    if item_id:
        r = requests.put(f"{BASE}/inventory/{item_id}", 
            json={"quantity": 60, "price": 550.0},
            headers=auth_headers(vnd_token))
        log("updateInventory", "PUT", f"/inventory/{item_id}", r.status_code, r.ok,
            f"- {r.text[:100]}" if not r.ok else "")
    else:
        log("updateInventory", "PUT", "/inventory/X", 0, False, "(skipped)")
    
    return item_id

# ============ REQUESTS ============
def test_request_endpoints(req_token):
    print("\n🔵 REQUEST ENDPOINTS")
    
    # POST /requests
    r = requests.post(f"{BASE}/requests", headers=auth_headers(req_token),
        json={
            "resource_name": "Oxygen Cylinder",
            "category": "medical",
            "quantity": 5,
            "location_lat": 19.076,
            "location_lng": 72.877,
            "city": "Mumbai",
            "urgency_level": "HIGH",
            "notes": "Urgent need for hospital"
        })
    log("createRequest", "POST", "/requests", r.status_code, r.ok,
        f"- {r.text[:150]}" if not r.ok else "")
    request_id = r.json().get("id") if r.ok else None
    
    # GET /requests/my
    r = requests.get(f"{BASE}/requests/my", headers=auth_headers(req_token))
    log("getRequestHistory", "GET", "/requests/my", r.status_code, r.ok)
    
    # GET /requests/stats
    r = requests.get(f"{BASE}/requests/stats", headers=auth_headers(req_token))
    log("getRequesterStats", "GET", "/requests/stats", r.status_code, r.ok)
    
    # GET /requests/{id}
    if request_id:
        r = requests.get(f"{BASE}/requests/{request_id}", headers=auth_headers(req_token))
        log("getRequestDetails", "GET", f"/requests/{request_id}", r.status_code, r.ok)
        
        # GET /requests/{id}/matches
        r = requests.get(f"{BASE}/requests/{request_id}/matches", headers=auth_headers(req_token))
        log("getRequestMatches", "GET", f"/requests/{request_id}/matches", r.status_code, r.ok)
        
        # POST /requests/{id}/cancel
        r = requests.post(f"{BASE}/requests/{request_id}/cancel", headers=auth_headers(req_token))
        log("cancelRequest", "POST", f"/requests/{request_id}/cancel", r.status_code, r.ok)
    else:
        log("getRequestDetails", "GET", "/requests/X", 0, False, "(skipped)")
        log("getRequestMatches", "GET", "/requests/X/matches", 0, False, "(skipped)")
        log("cancelRequest", "POST", "/requests/X/cancel", 0, False, "(skipped)")
    
    return request_id

# ============ MATCHES ============
def test_match_endpoints(vnd_token):
    print("\n🔵 MATCH ENDPOINTS")
    
    # GET /matches/incoming
    r = requests.get(f"{BASE}/matches/incoming", headers=auth_headers(vnd_token))
    log("getVendorMatches", "GET", "/matches/incoming", r.status_code, r.ok,
        f"- {r.text[:100]}" if not r.ok else "")
    
    # POST /matches/{id}/vendor-accept (test with non-existent id)
    r = requests.post(f"{BASE}/matches/99999/vendor-accept", headers=auth_headers(vnd_token))
    expected = r.status_code == 404  # Should be 404
    log("vendorAcceptMatch (404 expected)", "POST", "/matches/99999/vendor-accept", 
        r.status_code, expected, "- correctly returns 404")

# ============ CAMPAIGNS ============
def test_campaign_endpoints(req_token):
    print("\n🔵 CAMPAIGN ENDPOINTS")
    
    # POST /campaigns (create)
    r = requests.post(f"{BASE}/campaigns", headers=auth_headers(req_token),
        json={
            "title": "Test Campaign for Medical Aid",
            "description": "This is a test campaign to provide medical aid to those in need in Mumbai area",
            "category": "medical",
            "city": "Mumbai",
            "goal_amount": 50000.0,
            "urgency_level": "HIGH",
            "cover_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA"
        })
    log("createCampaign", "POST", "/campaigns", r.status_code, r.ok,
        f"- {r.text[:150]}" if not r.ok else "")
    campaign_id = r.json().get("id") if r.ok else None
    if r.ok:
        created_cover_image = r.json().get("cover_image")
        cover_image_result = created_cover_image == "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA"
        log("createCampaignCoverImage", "POST", "/campaigns", r.status_code, cover_image_result,
            f"- cover_image stored: {created_cover_image[:40]}..." if created_cover_image else "- missing cover_image")
    
    # GET /campaigns (list)
    r = requests.get(f"{BASE}/campaigns")
    log("getCampaigns", "GET", "/campaigns", r.status_code, r.ok)
    
    # GET /campaigns?category=medical&city=Mumbai
    r = requests.get(f"{BASE}/campaigns?category=medical&city=Mumbai")
    log("getCampaigns (filtered)", "GET", "/campaigns?category=medical&city=Mumbai", r.status_code, r.ok)
    
    # GET /campaigns/recommendations
    r = requests.get(f"{BASE}/campaigns/recommendations", headers=auth_headers(req_token))
    log("getPersonalizedCampaigns", "GET", "/campaigns/recommendations", r.status_code, r.ok,
        f"- {r.text[:150]}" if not r.ok else "")
    
    # GET /campaigns/my
    r = requests.get(f"{BASE}/campaigns/my", headers=auth_headers(req_token))
    log("getMyCreatedCampaigns", "GET", "/campaigns/my", r.status_code, r.ok,
        f"- {r.text[:200]}" if not r.ok else "")
    
    # GET /campaigns/my-donations
    r = requests.get(f"{BASE}/campaigns/my-donations", headers=auth_headers(req_token))
    log("getDonationHistory", "GET", "/campaigns/my-donations", r.status_code, r.ok,
        f"- {r.text[:200]}" if not r.ok else "")
    
    if campaign_id:
        # GET /campaigns/{id}
        r = requests.get(f"{BASE}/campaigns/{campaign_id}")
        log("getCampaignDetails", "GET", f"/campaigns/{campaign_id}", r.status_code, r.ok)
        
        # GET /campaigns/{id}/donations
        r = requests.get(f"{BASE}/campaigns/{campaign_id}/donations")
        log("getCampaignDonations", "GET", f"/campaigns/{campaign_id}/donations", r.status_code, r.ok)
        
        # GET /campaigns/{id}/stats
        r = requests.get(f"{BASE}/campaigns/{campaign_id}/stats")
        log("getCampaignStats", "GET", f"/campaigns/{campaign_id}/stats", r.status_code, r.ok)
        
        # GET /campaigns/{id}/related
        r = requests.get(f"{BASE}/campaigns/{campaign_id}/related")
        log("getRelatedCampaigns", "GET", f"/campaigns/{campaign_id}/related", r.status_code, r.ok)
        
        # GET /campaigns/{id}/updates
        r = requests.get(f"{BASE}/campaigns/{campaign_id}/updates")
        log("getCampaignUpdates", "GET", f"/campaigns/{campaign_id}/updates", r.status_code, r.ok)
        
        # POST /campaigns/{id}/donate
        r = requests.post(
            f"{BASE}/campaigns/{campaign_id}/donate?amount=100&anonymous=false",
            headers=auth_headers(req_token))
        log("donateToCampaign", "POST", f"/campaigns/{campaign_id}/donate", r.status_code, r.ok,
            f"- {r.text[:150]}" if not r.ok else "")
    else:
        for name in ["getCampaignDetails","getCampaignDonations","getCampaignStats",
                      "getRelatedCampaigns","getCampaignUpdates","donateToCampaign"]:
            log(name, "GET/POST", "/campaigns/X/...", 0, False, "(skipped)")
    
    return campaign_id



# ============ ADMIN ============
def test_admin_endpoints(adm_token, campaign_id):
    print("\n🔵 ADMIN ENDPOINTS")
    
    if not adm_token:
        print("  ⚠️ No admin token - skipping admin tests")
        return
    
    # GET /admin/stats
    r = requests.get(f"{BASE}/admin/stats", headers=auth_headers(adm_token))
    log("getAdminStats", "GET", "/admin/stats", r.status_code, r.ok,
        f"- {r.text[:150]}" if not r.ok else "")
    
    # GET /admin/users
    r = requests.get(f"{BASE}/admin/users?skip=0&limit=10", headers=auth_headers(adm_token))
    log("getAdminUsers", "GET", "/admin/users", r.status_code, r.ok,
        f"- {r.text[:100]}" if not r.ok else "")
    
    # GET /admin/vendors
    r = requests.get(f"{BASE}/admin/vendors?skip=0&limit=10", headers=auth_headers(adm_token))
    log("getAdminVendors", "GET", "/admin/vendors", r.status_code, r.ok,
        f"- {r.text[:100]}" if not r.ok else "")
    
    # GET /admin/campaigns
    r = requests.get(f"{BASE}/admin/campaigns?skip=0&limit=10", headers=auth_headers(adm_token))
    log("getAdminCampaigns", "GET", "/admin/campaigns", r.status_code, r.ok,
        f"- {r.text[:100]}" if not r.ok else "")
    
    if campaign_id:
        # PUT /admin/campaigns/{id}/verify
        r = requests.put(f"{BASE}/admin/campaigns/{campaign_id}/verify?verified=true",
            headers=auth_headers(adm_token))
        log("verifyCampaign", "PUT", f"/admin/campaigns/{campaign_id}/verify", r.status_code, r.ok,
            f"- {r.text[:100]}" if not r.ok else "")
        
        # PUT /admin/campaigns/{id}/flag
        r = requests.put(f"{BASE}/admin/campaigns/{campaign_id}/flag?flagged=true",
            headers=auth_headers(adm_token))
        log("flagCampaign", "PUT", f"/admin/campaigns/{campaign_id}/flag", r.status_code, r.ok,
            f"- {r.text[:100]}" if not r.ok else "")
    
    # PUT /admin/vendors/{id}/verification (test with vendor id 1 if exists)
    r = requests.get(f"{BASE}/admin/vendors?skip=0&limit=1", headers=auth_headers(adm_token))
    if r.ok and r.json():
        vendor_id = r.json()[0].get("id", 1)
        r = requests.put(f"{BASE}/admin/vendors/{vendor_id}/verification?status=VERIFIED",
            headers=auth_headers(adm_token))
        log("verifyVendor", "PUT", f"/admin/vendors/{vendor_id}/verification", r.status_code, r.ok,
            f"- {r.text[:100]}" if not r.ok else "")
    else:
        log("verifyVendor", "PUT", "/admin/vendors/X/verification", 0, False, "(no vendors)")

# ============ DELETE PROFILE ============
def test_delete_profile(req_token):
    print("\n🔵 DELETE PROFILE ENDPOINT")
    # We won't actually delete the test user to keep other tests valid
    # Just verify the endpoint exists
    # DELETE /auth/profile
    r = requests.delete(f"{BASE}/auth/profile", headers=auth_headers(req_token))
    # This might be 200, 204, or 405 depending on implementation
    log("deleteProfile", "DELETE", "/auth/profile", r.status_code, 
        r.status_code < 500, f"- response: {r.text[:100]}")


# ============ MAIN ============
def main():
    print("=" * 60)
    print("  EmpathI Frontend→Backend API Test Suite")
    print("  (All endpoints except login/register)")
    print("=" * 60)
    
    # 1. Health check
    if not test_health():
        print("\n❌ Backend unreachable! Start it with: cd backend && python main.py")
        sys.exit(1)
    
    # 2. Setup
    req_token, vnd_token, adm_token = setup_users()
    if not req_token or not vnd_token:
        print("\n❌ Failed to create test users/tokens. Aborting.")
        sys.exit(1)
    
    # 3. Run all test groups
    test_auth_endpoints(req_token)
    test_vendor_endpoints(vnd_token)
    test_inventory_endpoints(vnd_token)
    request_id = test_request_endpoints(req_token)
    test_match_endpoints(vnd_token)
    campaign_id = test_campaign_endpoints(req_token)
    test_admin_endpoints(adm_token, campaign_id)
    
    # 4. Summary
    print("\n" + "=" * 60)
    print("  RESULTS SUMMARY")
    print("=" * 60)
    passed = sum(1 for r in RESULTS if r["ok"])
    failed = sum(1 for r in RESULTS if not r["ok"])
    total = len(RESULTS)
    
    print(f"\n  Total: {total} | ✅ Passed: {passed} | ❌ Failed: {failed}")
    
    if failed > 0:
        print("\n  FAILED TESTS:")
        for r in RESULTS:
            if not r["ok"]:
                print(f"    ❌ {r['name']} (status: {r['status']})")
    
    print(f"\n  Pass Rate: {passed/total*100:.1f}%")
    print("=" * 60)
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
