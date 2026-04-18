# AVRE E2E Testing - Comprehensive Guide

## Quick Start (2 minutes)

### On Windows:
```cmd
# Double-click this file:
run_e2e_tests.bat

# Then select option 6 for quick test
```

### On Linux/Mac:
```bash
chmod +x run_e2e_tests.sh
./run_e2e_tests.sh

# Then select option 6 for quick test
```

### Manual (Windows):
```cmd
# Ensure backend and frontend are running, then:
pytest tests/test_e2e_vendor_requester.py -v -s
```

---

## What Gets Tested

### 🔷 Vendor Workflow (Dr. Sharma Medical Supplies)

#### Test 1: Registration
- ✅ Create vendor account
- ✅ Email: dr_sharma_supplies@gmail.com
- ✅ Password: VendorPass123!
- ✅ Role: Vendor

#### Test 2: Login
- ✅ Login with credentials
- ✅ Access vendor dashboard
- ✅ Verify session token

#### Test 3: Profile Setup
- ✅ Enter full name: Dr. Sharma Medical Supplies
- ✅ Phone: 9876543210
- ✅ Shop name: Sharma Medical & Surgical Store
- ✅ Organization: Sharma Medical Group
- ✅ **Full Address**: 234/A Medical Plaza, Rajendra Nagar, Delhi 110060
- ✅ Bio: 15+ years experience
- ✅ Save and verify

#### Test 4: Add Inventory (15 items)
Each item includes:
- Resource name
- Category (Medical/Emergency)
- Quantity (realistic hospital stock)
- Price in ₹ (rupees)
- Reorder level

**Items created:**
1. Oxygen Cylinder Type B - 150 units ₹2,500 each
2. N95 Respirator Masks - 500 boxes ₹1,200 each
3. Medical Latex Gloves - 800 pairs ₹450 each
4. Sterile Gauze Pads - 1,200 boxes ₹350 each
5. IV Fluid Stand - 45 units ₹3,200 each
6. Emergency Crash Cart - 8 units ₹45,000 each
7. Ventilator Circuits - 180 units ₹850 each
8. Portable ECG Machine - 12 units ₹28,000 each
9. Pulse Oximeter - 350 units ₹1,800 each
10. Digital Thermometer - 420 units ₹1,200 each
11. Blood Pressure Monitor - 85 units ₹2,100 each
12. Ambu Bag - 25 units ₹3,500 each
13. Syringes & Needles - 2,000 boxes ₹280 each
14. IV Cannula - 350 sets ₹420 each
15. Emergency Stretcher - 6 units ₹15,000 each

#### Test 5: Verify Inventory
- ✅ All 15 items display in list
- ✅ Search functionality works
- ✅ Category filter works
- ✅ CSV export works

#### Test 6: Export Inventory
- ✅ Click Export button
- ✅ Download CSV file with all items

---

### 🟢 Requester Workflow (Naidu General Hospital)

#### Test 1: Registration
- ✅ Create requester account
- ✅ Email: dr_rajesh_ngh@gmail.com
- ✅ Password: RequesterPass123!
- ✅ Role: Requester

#### Test 2: Login
- ✅ Login with credentials
- ✅ Access requester dashboard
- ✅ Verify session token

#### Test 3: Profile Setup
- ✅ Enter name: Dr. Rajesh Kumar
- ✅ Phone: 9123456789
- ✅ Organization: Naidu General Hospital, Bangalore
- ✅ **Full Address**: Indiranagar Main Road, Bangalore 560038
- ✅ Bio: Emergency response coordinator for hospital disaster management
- ✅ Save and verify

#### Test 4: Create Requests (5 items)
Each request includes:
- Resource name
- Quantity needed
- Urgency level (High/Medium)
- Description
- Hospital location

**Requests created:**
1. **Oxygen Cylinders** - 30 units (High Urgency)
   - Description: Emergency oxygen supply for ICU ward expansion

2. **N95 Respirator Masks** - 200 units (High Urgency)
   - Description: For COVID-19 ward staff protection

3. **Latex Gloves** - 100 units (Medium Urgency)
   - Description: General medical department requirement

4. **Gauze Pads** - 300 units (Medium Urgency)
   - Description: Wound care and dressing supplies

5. **Emergency Crash Cart** - 1 unit (High Urgency)
   - Description: Fully equipped crash cart for emergency department

#### Test 5: View Matching
- ✅ Requests display in history
- ✅ Matching vendors can be viewed
- ✅ Distance and urgency indicators show

---

### ⚡ Concurrent Operations Tests

#### Test 1: Simultaneous Access
- ✅ Vendor browser accessing inventory
- ✅ Requester browser creating requests
- **At the same time** - tests concurrent session handling

#### Test 2: Parallel Data Loading
- ✅ Vendor loading analytics
- ✅ Requester loading dashboard stats
- **At the same time** - tests database concurrency

---

### 🎯 End-to-End Integration Test

Complete workflow verification:
```
Phase 1: Vendor Setup (Complete)
├─ Register: dr_sharma_supplies@gmail.com
├─ Profile: 234/A Medical Plaza, Delhi 110060
├─ Inventory: 15 realistic medical items
└─ Verification: All items searchable & exportable

Phase 2: Requester Setup (Complete)
├─ Register: dr_rajesh_ngh@gmail.com
├─ Profile: Naidu General Hospital, Bangalore
├─ Requests: 5 resource requests created
└─ Verification: All requests visible in history

Phase 3: Matching (In Progress)
├─ System: Looking for matching vendors
├─ Status: Requests awaiting vendor response
└─ Verification: Vendor can see incoming requests

Phase 4: Summary
└─ Status: ✅ All tests passed, system ready for deployment
```

---

## Test Execution Flow Diagram

```
START
  │
  ├─────────────────────────────────────────┐
  │                                         │
  v                                         v
VENDOR FLOW                          REQUESTER FLOW
  │                                         │
  ├─ Register                              ├─ Register
  ├─ Login                                 ├─ Login
  ├─ Setup Profile (Delhi)                ├─ Setup Profile (Bangalore)
  ├─ Add 15 Items                          ├─ Create 5 Requests
  └─ Verify & Export                       └─ View Requests
  │                                         │
  └─────────────────────────────────────────┘
         │
         v
   CONCURRENT TESTS
   (Both running simultaneously)
         │
         v
  END-TO-END VERIFICATION
   (All systems operational)
         │
         v
      END ✅
```

---

## Expected Results

### Console Output
```
========================================================================
test_e2e_vendor_requester.py::TestVendorFlow::test_01_vendor_register PASSED
🔷 Starting Vendor Registration
✅ Vendor Registration Complete

test_e2e_vendor_requester.py::TestVendorFlow::test_02_vendor_login PASSED
🔷 Starting Vendor Login
✅ Vendor Login Successful

test_e2e_vendor_requester.py::TestVendorFlow::test_03_vendor_profile_setup PASSED
🔷 Setting up Vendor Profile
✅ Vendor Profile Setup Complete

test_e2e_vendor_requester.py::TestVendorFlow::test_04_vendor_add_inventory PASSED
🔷 Adding 15 Inventory Items
  Adding item 1/15: Oxygen Cylinder Type B (Medical Grade)
  Adding item 2/15: N95 Respirator Masks (Box of 50)
  ... [13 more items]
✅ Added All 15 Inventory Items

[REQUESTER TESTS RUNNING IN PARALLEL...]

test_e2e_vendor_requester.py::TestRequesterFlow::test_04_requester_create_requests PASSED
🟢 Creating 5 Resource Requests
  Creating request 1/5: Oxygen Cylinders
  Creating request 2/5: N95 Respirator Masks
  ... [3 more requests]
✅ Created All 5 Resource Requests

test_e2e_vendor_requester.py::TestConcurrentFlow::test_concurrent_vendor_requester_operations PASSED
⚡ Concurrent: Vendor showing 15 items, Requester page loaded

test_e2e_vendor_requester.py::TestFullIntegration::test_end_to_end_workflow PASSED
🚀 COMPLETE END-TO-END WORKFLOW TEST
[COMPREHENSIVE SUMMARY REPORT]

============================================================
✅ Test Session Complete - All 15 Tests Passed
============================================================
```

### Database Verification
After tests run, database should contain:

**Users Table:**
- 1 Vendor user: dr_sharma_supplies@gmail.com (Role: Vendor)
- 1 Requester user: dr_rajesh_ngh@gmail.com (Role: Requester)

**Vendors Table:**
- Shop: Sharma Medical & Surgical Store
- Location: Delhi
- Address: 234/A Medical Plaza, Rajendra Nagar, Delhi 110060

**Inventory Table:**
- 15 items total
- Stock values: 6 to 2,000 units
- Prices: ₹280 to ₹45,000

**Requests Table:**
- 5 requests total
- 3 High urgency
- 2 Medium urgency
- Requesting organization: Naidu General Hospital

**Matches Table:**
- System calculates match scores between requests and inventory
- 5 matches created (1 per request)

---

## Troubleshooting

### ❌ "Connection refused" error
**Cause**: Backend or Frontend not running

**Fix**:
```bash
# Terminal 1 - Start Backend
cd backend
python main.py

# Terminal 2 - Start Frontend  
cd empathi-frontend
npm run dev
```

### ❌ "Element not found" error
**Cause**: UI element selectors don't match your version

**Fix**:
1. Open browser DevTools (F12)
2. Inspect the element you need
3. Update XPath in test file
4. Re-run test

### ❌ "Timeout" error
**Cause**: Forms taking longer to render

**Fix**:
```python
# In test file, increase wait time:
WebDriverWait(driver, 20)  # 20 seconds instead of 10
```

### ❌ "Chrome driver not found"
**Cause**: ChromeDriver not in PATH

**Fix**:
1. Download from: https://chromedriver.chromium.org/
2. Add to System PATH or
3. Place in `C:\Windows\System32` (Windows)

---

## Test Metrics

| Metric | Value |
|--------|-------|
| Total Tests | 15 |
| Total Test Steps | 50+ |
| Items Created | 20 (15 inventory + 5 requests) |
| Data Fields Validated | 100+ |
| Concurrent Sessions | 2 (Vendor + Requester) |
| Estimated Duration | 5-10 minutes |
| Pass Rate Target | 100% |

---

## Next Steps After Tests Pass

1. ✅ **Verify Database**: Check all 20 items in database
2. ✅ **Test Matching**: Manually verify vendor-requester matches
3. ✅ **Load Testing**: Test with 100+ users
4. ✅ **Stress Testing**: Test with 1000+ inventory items
5. ✅ **Performance**: Monitor response times
6. ✅ **Security**: Verify authentication and authorization
7. ✅ **Deployment**: Ready for production release

---

## Support & Documentation

- Full E2E Guide: `tests/E2E_TESTING_README.md`
- Test Code: `tests/test_e2e_vendor_requester.py`
- Pytest Config: `tests/pytest.ini`
- Fixtures: `tests/conftest.py`

---

**Status**: ✅ Ready to Run  
**Last Updated**: 2026-04-18  
**Test Suite Version**: 1.0.0
