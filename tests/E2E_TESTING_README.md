# AVRE Platform - End-to-End Testing Suite

## Overview

This testing suite performs comprehensive end-to-end testing of the AVRE (Adaptive Vendor Relevance Engine) platform with realistic concurrent workflows for both **Vendor** and **Requester** roles.

### Key Features

✅ **Concurrent Testing**: Opens vendor and requester browsers simultaneously  
✅ **Realistic Data**: Uses actual Indian addresses, pin codes, and medical supplies  
✅ **Complete Workflows**: Tests full user journey from registration to request matching  
✅ **Automated Inventory**: Creates 15 realistic medical items with real pricing  
✅ **Automated Requests**: Creates 5 resource requests from a hospital  
✅ **Data Validation**: Verifies all data persists correctly  

---

## Test Data Included

### Vendor Data
- **Vendor Name**: Dr. Sharma Medical Supplies
- **Location**: 234/A Medical Plaza, Rajendra Nagar, Delhi 110060
- **Business**: Sharma Medical & Surgical Store
- **Experience**: 15+ years serving Delhi NCR

### Requester Data
- **Organization**: Naidu General Hospital, Bangalore
- **Location**: Indiranagar Main Road, Bangalore 560038
- **Contact**: Dr. Rajesh Kumar (Emergency Coordinator)

### Inventory Items (15 items)
1. **Oxygen Cylinder Type B** - 150 units @ ₹2,500
2. **N95 Respirator Masks** - 500 boxes @ ₹1,200
3. **Medical-Grade Latex Gloves** - 800 pairs @ ₹450
4. **Sterile Gauze Pads 4x4** - 1,200 boxes @ ₹350
5. **IV Fluid Stand (Stainless Steel)** - 45 units @ ₹3,200
6. **Emergency Crash Cart** - 8 units @ ₹45,000
7. **Ventilator Circuits & Tubing** - 180 units @ ₹850
8. **Portable ECG Machine** - 12 units @ ₹28,000
9. **Pulse Oximeter Digital** - 350 units @ ₹1,800
10. **Digital Thermometers** - 420 units @ ₹1,200
11. **Blood Pressure Monitor** - 85 units @ ₹2,100
12. **Ambu Bag (Manual Resuscitator)** - 25 units @ ₹3,500
13. **Sterile Syringes & Needles** - 2,000 boxes @ ₹280
14. **IV Cannula Assorted** - 350 sets @ ₹420
15. **Emergency Stretcher (Hydraulic)** - 6 units @ ₹15,000

### Request Items (5 items)
1. **Oxygen Cylinders** - 30 units (High Urgency)
2. **N95 Respirator Masks** - 200 units (High Urgency)
3. **Latex Gloves** - 100 units (Medium Urgency)
4. **Gauze Pads** - 300 units (Medium Urgency)
5. **Emergency Crash Cart** - 1 unit (High Urgency)

---

## Setup Instructions

### Prerequisites
- Python 3.8+
- Google Chrome/Chromium installed
- ChromeDriver compatible with your Chrome version
- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:5173`

### 1. Install Test Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This installs:
- `selenium==4.15.2` - Web browser automation
- `pytest==7.4.3` - Testing framework
- `pytest-asyncio==0.21.1` - Async test support

### 2. Download ChromeDriver

Download ChromeDriver from https://chromedriver.chromium.org/ matching your Chrome version.

On Linux/Mac:
```bash
# Add to PATH
export PATH=$PATH:/path/to/chromedriver/directory
```

On Windows:
```bash
# Add directory to PATH via Environment Variables, or copy chromedriver.exe to:
C:\Windows\System32
```

### 3. Start Backend & Frontend

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
# Backend will start on http://localhost:8000
```

**Terminal 2 - Frontend:**
```bash
cd empathi-frontend
npm run dev
# Frontend will start on http://localhost:5173
```

### 4. Create Screenshots Directory

```bash
mkdir -p screenshots
```

---

## Running Tests

### Run All Tests
```bash
pytest tests/test_e2e_vendor_requester.py -v -s
```

### Run Specific Test Classes
```bash
# Vendor tests only
pytest tests/test_e2e_vendor_requester.py::TestVendorFlow -v -s

# Requester tests only
pytest tests/test_e2e_vendor_requester.py::TestRequesterFlow -v -s

# Concurrent tests only
pytest tests/test_e2e_vendor_requester.py::TestConcurrentFlow -v -s

# Integration tests only
pytest tests/test_e2e_vendor_requester.py::TestFullIntegration -v -s
```

### Run Specific Tests
```bash
# Vendor registration only
pytest tests/test_e2e_vendor_requester.py::TestVendorFlow::test_01_vendor_register -v -s

# Requester profile setup
pytest tests/test_e2e_vendor_requester.py::TestRequesterFlow::test_03_requester_profile_setup -v -s

# Add all inventory items
pytest tests/test_e2e_vendor_requester.py::TestVendorFlow::test_04_vendor_add_inventory -v -s
```

### Run with Markers
```bash
# All vendor tests
pytest tests/test_e2e_vendor_requester.py -m vendor -v -s

# All requester tests
pytest tests/test_e2e_vendor_requester.py -m requester -v -s

# Integration tests only
pytest tests/test_e2e_vendor_requester.py -m integration -v -s
```

### Run with Detailed Logging
```bash
pytest tests/test_e2e_vendor_requester.py -v -s --log-cli-level=INFO
```

---

## Test Flow Overview

### Phase 1: Vendor Setup (TestVendorFlow)
```
1. Register vendor account
   └─ Email: dr_sharma_supplies@gmail.com
   └─ Role: Vendor

2. Login to vendor dashboard
   └─ Access: /vendor/dashboard

3. Complete profile with full address
   └─ Shop: 234/A Medical Plaza, Rajendra Nagar
   └─ City: Delhi, Pin: 110060
   └─ Bio: 15+ years experience

4. Add 15 inventory items
   └─ Realistic medical supplies
   └─ Real pricing in rupees
   └─ Stock quantities based on typical pharmacy

5. Verify inventory display
   └─ Check CSV export works
```

### Phase 2: Requester Setup (TestRequesterFlow)
```
1. Register requester account
   └─ Email: dr_rajesh_ngh@gmail.com
   └─ Role: Requester

2. Login to requester dashboard
   └─ Access: /requester/dashboard

3. Complete hospital profile
   └─ Hospital: Naidu General Hospital
   └─ Location: Indiranagar, Bangalore 560038
   └─ Coordinator: Dr. Rajesh Kumar

4. Create 5 resource requests
   └─ Oxygen for ICU
   └─ N95 masks for COVID ward
   └─ Emergency supplies
   └─ Surgical supplies

5. View request matching results
   └─ Check matched vendors
```

### Phase 3: Concurrent Operations (TestConcurrentFlow)
```
1. Vendor browsing inventory while
   └─ Requester creating requests simultaneously

2. Both accessing analytics
   └─ Vendor: Revenue, match rate, stock coverage
   └─ Requester: Request status, matching vendors

3. Verify system stability
   └─ No race conditions
   └─ Data consistency maintained
```

### Phase 4: Full Integration (TestFullIntegration)
```
1. Complete workflow summary
2. Verify all data persisted
3. Print comprehensive report
```

---

## Expected Output

When tests run successfully, you'll see:

```
========================================================================
AVRE Platform - End-to-End Testing Suite
Testing: Concurrent Vendor & Requester Workflows
Data: Realistic Indian Medical Suppliers & Hospital Data
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
  ... (13 more items)
✅ Added All 15 Inventory Items

test_e2e_vendor_requester.py::TestRequesterFlow::test_01_requester_register PASSED
🟢 Starting Requester Registration
✅ Requester Registration Complete

test_e2e_vendor_requester.py::TestRequesterFlow::test_04_requester_create_requests PASSED
🟢 Creating 5 Resource Requests
  Creating request 1/5: Oxygen Cylinders
  Creating request 2/5: N95 Respirator Masks
  ... (3 more requests)
✅ Created All 5 Resource Requests

test_e2e_vendor_requester.py::TestConcurrentFlow::test_concurrent_vendor_requester_operations PASSED
⚡ Concurrent: Vendor showing 15 items, Requester page loaded

test_e2e_vendor_requester.py::TestFullIntegration::test_end_to_end_workflow PASSED
🚀 COMPLETE END-TO-END WORKFLOW TEST
...

============================================================
✅ Test Session Complete
============================================================
```

---

## Troubleshooting

### ChromeDriver not found
**Error**: `ChromeDriver not found in PATH`

**Solution**:
1. Download ChromeDriver matching your Chrome version
2. Add to system PATH or specify in test:
```python
driver = webdriver.Chrome('/path/to/chromedriver')
```

### Element not found errors
**Error**: `TimeoutException: Message: no such element`

**Likely cause**: Element selectors don't match your frontend structure

**Solution**:
1. Update XPath in test file to match your HTML
2. Use browser DevTools to inspect elements
3. Update locators in helper functions

### Connection refused
**Error**: `ConnectionRefusedError: [Errno 111] Connection refused`

**Solution**:
1. Ensure backend is running on `http://localhost:8000`
2. Ensure frontend is running on `http://localhost:5173`
3. Check firewall settings

### Timeout during login
**Error**: `TimeoutException: Message: Timed out after 10 seconds`

**Likely cause**: Page takes longer to load, or selectors are wrong

**Solution**:
```python
# Increase timeout in test
WebDriverWait(driver, 20)  # 20 seconds instead of 10

# Or modify in conftest.py
driver.implicitly_wait(20)
```

### Tests pass but no inventory shows
**Issue**: Inventory added but not visible in list

**Solution**:
1. Add explicit wait for table refresh:
```python
time.sleep(2)  # Wait for page refresh
```

2. Check browser console for JavaScript errors
3. Verify API calls in Network tab

---

## Extending Tests

### Add More Inventory Items
Edit `INVENTORY_ITEMS` in test file:
```python
INVENTORY_ITEMS = [
    {
        "name": "Your Item Name",
        "category": "Medical",  # or "Emergency"
        "quantity": 100,
        "price": 1000,
        "reorder_level": 20,
        "description": "Item description"
    },
    # ... more items
]
```

### Add More Request Types
Edit `REQUEST_ITEMS`:
```python
REQUEST_ITEMS = [
    {
        "name": "Your Request",
        "quantity": 50,
        "urgency": "High",  # or "Medium", "Low"
        "description": "Request description"
    },
]
```

### Add Multiple Vendors/Requesters
Edit `VENDORS_DATA` and `REQUESTERS_DATA`:
```python
VENDORS_DATA = [
    { ... },  # Vendor 1
    { ... },  # Vendor 2
]
```

---

## Performance Notes

- **Typical Duration**: 5-10 minutes for full test suite
- **Inventory Addition**: ~30 seconds per item
- **Request Creation**: ~20 seconds per request
- **Total Items Tested**: 15 inventory + 5 requests = 20 items

Optimize timing in `time.sleep()` calls if needed.

---

## Screenshots

Test failures will save screenshots in the `screenshots/` directory:
- `screenshots/vendor_login_failure.png`
- `screenshots/inventory_add_error.png`
- `screenshots/request_creation_step.png`

Check these for debugging visual issues.

---

## Best Practices

1. **Run tests sequentially** - Don't run parallel tests with same account
2. **Fresh database** - Clear test data between runs if needed
3. **Check logs** - Review pytest output for errors
4. **Use verbose mode** - `-v -s` shows detailed output
5. **Screenshot on failure** - Helps debug UI issues

---

## Support

For issues or questions:
1. Check test logs: `pytest ... -v -s --log-cli-level=DEBUG`
2. Review screenshots in `screenshots/` folder
3. Check browser console for JavaScript errors
4. Verify backend API responses in Network tab

---

## Next Steps

After successful test run:
1. ✅ Data is verified in database
2. ✅ Vendor inventory is searchable
3. ✅ Requester can create matching requests
4. ✅ System handles concurrent operations
5. ✅ Frontend forms work correctly

Ready for deployment! 🚀
