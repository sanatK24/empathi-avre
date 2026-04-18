# E2E Test Suite - Quick Start Guide

## Overview

The EmpathI project now includes a comprehensive E2E test suite with 85+ test cases covering:
- Campaign CRUD operations
- Donation flows
- Payment processing
- Analytics and ML recommendations
- Admin operations
- Data persistence
- Error handling

## Prerequisites

### 1. Install Test Dependencies

```bash
cd backend
pip install -r requirements.txt
```

This includes:
- pytest, pytest-cov, pytest-timeout, pytest-html
- requests (HTTP testing)
- selenium (UI testing)
- faker (test data)

### 2. Create Test Users in Database

Before running tests, create these user accounts in the system:

```python
# Run this once to create test accounts
cd backend
python

from database import SessionLocal, Base, engine
from models import User, UserRole
from auth import get_password_hash

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Create test requester
requester = User(
    name="Test Requester",
    email="test.requester@example.com",
    password_hash=get_password_hash("testpass123!"),
    role=UserRole.REQUESTER,
    is_active=True
)
db.add(requester)

# Create test admin
admin = User(
    name="Test Admin",
    email="test.admin@example.com",
    password_hash=get_password_hash("testpass123!"),
    role=UserRole.ADMIN,
    is_active=True
)
db.add(admin)

db.commit()
print("✅ Test users created successfully!")
```

### 3. Configure Environment Variables

Create/update `.env` file in backend directory:

```env
# API Configuration
TEST_API_URL=http://localhost:8000
TEST_WEB_URL=http://localhost:5173

# Database
DATABASE_URL=sqlite:///./avre.db

# Browser Configuration
CHROME_HEADLESS=true
```

## Running Tests

### Option 1: Run Backend Tests Only (No UI Testing)

```bash
cd backend

# Start backend in one terminal
python -m uvicorn main:app --reload --port 8000

# In another terminal, run API tests
pytest tests/ -m api -v
```

### Option 2: Run All Tests (Including UI Tests)

```bash
# Terminal 1: Backend
cd backend
python -m uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd empathi-frontend
npm run dev

# Terminal 3: Tests
cd backend
pytest tests/ -v
```

### Specific Test Categories

```bash
# API tests only (fast)
pytest tests/ -m api -v

# Smoke tests (quick validation)
pytest tests/ -m smoke -v

# Integration tests
pytest tests/ -m integration -v

# Specific test file
pytest tests/test_campaigns_api.py -v

# Specific test class
pytest tests/test_campaigns_api.py::TestCampaignCRUD -v

# Single test
pytest tests/test_campaigns_api.py::TestCampaignCRUD::test_create_campaign -v
```

## Test Organization

### test_campaigns_api.py (20+ tests)
- Campaign CRUD operations
- Campaign filtering and search
- Campaign updates/progress posts
- Related campaigns functionality
- Pagination and sorting

### test_donations_payments.py (25+ tests)
- Complete donation flow
- All 4 payment methods (UPI, Card, Wallet, Bank)
- Campaign auto-completion
- Donation history
- Anonymous donation privacy

### test_analytics.py (20+ tests)
- Analytics dashboard metrics
- ML recommendation scoring
- Campaign performance calculations
- Similar campaigns algorithm
- 7-day trend analysis

### test_admin_operations.py (15+ tests)
- Campaign verification
- Status management
- Campaign filtering
- Authorization controls
- Audit logging

### test_data_persistence_errors.py (25+ tests)
- Database persistence validation
- Invalid input handling
- Edge cases (large numbers, special characters)
- Error recovery

## Output Options

### Verbose Output
```bash
pytest tests/ -v
```

### With Coverage Report
```bash
pytest tests/ --cov=backend --cov-report=html
# Opens htmlcov/index.html
```

### HTML Report
```bash
pytest tests/ --html=report.html --self-contained-html
```

### JUnit XML (for CI/CD)
```bash
pytest tests/ --junit-xml=test_results.xml
```

## Common Issues

### ❌ "Connection refused" Error
**Problem:** Backend not running
**Solution:** 
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

### ❌ "Invalid credentials" Error
**Problem:** Test users don't exist
**Solution:** Follow "Create Test Users" step above

### ❌ "Timeout" Error
**Problem:** Tests running too slow
**Solution:** 
- Skip slow tests: `pytest tests/ -m "not slow"`
- Run specific test file: `pytest tests/test_campaigns_api.py`

### ❌ ChromeDriver/Selenium Error
**Problem:** Browser automation issues
**Solution:**
```bash
pip install webdriver-manager
# Set CHROME_HEADLESS=true in .env
```

### ❌ Pydantic Import Error
**Problem:** `ModuleNotFoundError: No module named 'pydantic._internal._signature'`
**Solution:**
```bash
pip install --upgrade pydantic-settings==2.2.1
```

## Expected Test Results

### API Tests (No Backend Services)
```
✅ 77 tests collected
⏱️  ~20 seconds execution time
✅ All tests should PASS
```

### Full Test Suite (With All Services)
```
✅ 85+ tests collected
⏱️  ~60 seconds execution time (with UI tests)
✅ All tests should PASS
```

## Test Examples

### Example 1: Test Campaign Creation
```python
def test_create_campaign(authenticated_client, test_campaign_data):
    """Test creating a new campaign"""
    response = authenticated_client.post('/campaigns', json=test_campaign_data)
    
    assert response.status_code == 201
    assert response.json()['title'] == test_campaign_data['title']
    assert response.json()['goal_amount'] == test_campaign_data['goal_amount']
```

### Example 2: Test Donation Flow
```python
def test_donation_flow(authenticated_client, test_campaign_data, test_payment_data):
    """Test complete donation flow"""
    # Create campaign
    campaign_response = authenticated_client.post('/campaigns', json=test_campaign_data)
    campaign_id = campaign_response.json()['id']
    
    # Make donation
    payment_data = {
        'campaign_id': campaign_id,
        'amount': 1000,
        'payment_method': 'upi',
        'anonymous': False,
        'message': 'Great campaign!'
    }
    response = authenticated_client.post('/payments/process', json=payment_data)
    
    assert response.status_code == 200
    assert 'donation_id' in response.json()
```

## Performance Benchmarks

| Category | Tests | Time |
|----------|-------|------|
| Campaign CRUD | 20+ | 2-3s |
| Donations & Payments | 25+ | 3-4s |
| Analytics | 20+ | 2-3s |
| Admin Operations | 15+ | 2s |
| Data Persistence | 25+ | 3-4s |
| **Total** | **85+** | **20-30s** |

## Continuous Integration

### GitHub Actions

```yaml
name: Run E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.8'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Create test database
        run: |
          cd backend
          python -c "from database import Base, engine; Base.metadata.create_all(bind=engine)"
      
      - name: Run tests
        run: |
          cd backend
          pytest tests/ -m api --junit-xml=results.xml
      
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: backend/results.xml
```

## Next Steps

1. ✅ Run the test suite: `pytest tests/ -m api -v`
2. ✅ Check coverage: `pytest tests/ --cov=backend`
3. ✅ Generate HTML report: `pytest tests/ --html=report.html --self-contained-html`
4. ✅ Integrate with CI/CD pipeline
5. ✅ Add more test scenarios as features are added

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Requests Documentation](https://requests.readthedocs.io/)
- [Selenium Documentation](https://selenium.dev/documentation/)
- [FastAPI Testing](https://fastapi.tiangolo.com/advanced/testing-dependencies/)
