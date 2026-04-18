# E2E Test Suite Documentation

Comprehensive end-to-end testing suite for the EmpathI Campaign & Donation platform.

## Overview

This test suite validates:
- ✅ Campaign CRUD operations
- ✅ Complete donation flow
- ✅ Payment processing (all 4 methods)
- ✅ ML recommendation algorithm
- ✅ Admin operations and authorization
- ✅ Data persistence in database
- ✅ Error handling and edge cases

**Total Tests: 100+**
**Coverage: API, Integration, Smoke**

## Setup

### 1. Install Dependencies

```bash
cd backend
pip install -r tests/requirements.txt
```

### 2. Environment Configuration

Create `.env` file in backend directory:

```env
# API Configuration
TEST_API_URL=http://localhost:8000
TEST_WEB_URL=http://localhost:5173

# Database
DATABASE_URL=sqlite:///./test_avre.db

# Test Users (create these accounts first)
TEST_REQUESTER_EMAIL=test.requester@example.com
TEST_REQUESTER_PASSWORD=testpass123!
TEST_ADMIN_EMAIL=test.admin@example.com
TEST_ADMIN_PASSWORD=testpass123!

# Browser Configuration
CHROME_HEADLESS=true
```

### 3. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend (optional for UI tests):**
```bash
cd empathi-frontend
npm run dev
```

## Running Tests

### Run All Tests

```bash
pytest
```

### Run Specific Test Category

```bash
# API tests only
pytest -m api

# Smoke tests (quick validation)
pytest -m smoke

# Integration tests
pytest -m integration

# Slow tests
pytest -m slow
```

### Run Specific Test File

```bash
# Campaign CRUD tests
pytest backend/tests/test_campaigns_api.py

# Donation and payment tests
pytest backend/tests/test_donations_payments.py

# Analytics tests
pytest backend/tests/test_analytics.py

# Admin operations
pytest backend/tests/test_admin_operations.py

# Error handling
pytest backend/tests/test_data_persistence_errors.py
```

### Run Specific Test Class

```bash
pytest backend/tests/test_campaigns_api.py::TestCampaignCRUD
pytest backend/tests/test_donations_payments.py::TestDonationFlow
```

### Run Single Test

```bash
pytest backend/tests/test_campaigns_api.py::TestCampaignCRUD::test_create_campaign
```

## Test Organization

### conftest.py
- **APIClient**: HTTP client for API testing with auth support
- **Fixtures**: API client, browser, authenticated sessions
- **Test data**: Campaign, donation, payment test data

### test_campaigns_api.py (20+ tests)
- Campaign CRUD operations
- Campaign filtering and search
- Campaign updates/progress posts
- Related campaigns functionality

### test_donations_payments.py (25+ tests)
- Complete donation flow
- Payment method testing (UPI, Card, Wallet, Bank)
- Campaign auto-completion
- Donation history
- Anonymous donation privacy

### test_analytics.py (20+ tests)
- Analytics dashboard
- ML recommendation scoring
- Campaign performance metrics
- Similar campaigns algorithm

### test_admin_operations.py (15+ tests)
- Admin campaign management
- Campaign verification
- Status updates
- Authorization controls
- Audit logging

### test_data_persistence_errors.py (25+ tests)
- Database persistence validation
- Invalid input handling
- Edge cases
- Error recovery

## Test Markers

```bash
# Run only marked tests
pytest -m api              # API endpoint tests
pytest -m ui               # UI/Selenium tests
pytest -m integration      # Integration tests
pytest -m smoke            # Quick smoke tests
pytest -m slow             # Slow/long tests

# Exclude markers
pytest -m "not slow"       # Skip slow tests
```

## Output Options

### Verbose Output
```bash
pytest -v
```

### With Coverage Report
```bash
pytest --cov=backend --cov-report=html
# Opens htmlcov/index.html
```

### HTML Report
```bash
pytest --html=report.html --self-contained-html
```

### JUnit XML (for CI/CD)
```bash
pytest --junit-xml=test_results.xml
```

## Test Scenarios

### Campaign CRUD
- ✅ Create campaign with validation
- ✅ Retrieve single and list campaigns
- ✅ Update campaign fields
- ✅ Delete campaign (with/without donations)
- ✅ Search campaigns
- ✅ Auto-completion logic

### Donation Flow
- ✅ Create donation via payment
- ✅ Update campaign totals
- ✅ Campaign auto-completion
- ✅ Donation history
- ✅ Anonymous privacy
- ✅ Donor list visibility

### Payment Processing
- ✅ UPI payment (validation)
- ✅ Card payment (16-digit, expiry, CVV)
- ✅ Digital Wallet (phone validation)
- ✅ Bank transfer (account number)
- ✅ 95% success rate simulation
- ✅ Error handling

### Analytics
- ✅ Dashboard metrics calculation
- ✅ ML recommendation scoring
- ✅ Campaign performance metrics
- ✅ 7-day trend analysis
- ✅ Top supporters identification

### Admin Operations
- ✅ Campaign verification
- ✅ Status management
- ✅ Campaign filtering
- ✅ Authorization checks
- ✅ Audit logging

### Data Persistence
- ✅ Campaign persistence
- ✅ Donation persistence
- ✅ Update persistence
- ✅ Total calculation accuracy
- ✅ Multiple donations sum

### Error Handling
- ✅ Invalid input rejection
- ✅ Non-existent resource handling
- ✅ Authorization errors
- ✅ Validation error responses
- ✅ Edge cases (large numbers, special chars)

## Common Issues

### "Connection refused" Error
**Problem**: Backend not running
**Solution**: Start backend with `python -m uvicorn main:app --reload`

### "Invalid credentials" Error
**Problem**: Test user accounts don't exist
**Solution**: Create test users or adjust `.env` credentials

### "Timeout" Error
**Problem**: Tests running too slow
**Solution**: 
- Increase timeout in `pytest.ini`
- Use `-m "not slow"` to skip slow tests
- Run specific test file instead of all

### Chrome/Selenium Error
**Problem**: ChromeDriver issues
**Solution**: 
- `pip install webdriver-manager`
- Set `CHROME_HEADLESS=true` in `.env`
- Use `--headless` flag

## Performance Benchmarks

Expected execution times:
- Campaign CRUD tests: ~2 seconds
- Donation flow tests: ~3 seconds
- Payment tests: ~4 seconds
- Analytics tests: ~2 seconds
- Admin tests: ~2 seconds
- Persistence tests: ~3 seconds
- Error tests: ~2 seconds

**Total Suite: ~20 seconds** (with headless Chrome)

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: |
    cd backend
    pytest tests/ -m api --junit-xml=results.xml
```

### GitLab CI Example
```yaml
test:e2e:
  script:
    - cd backend
    - pytest tests/ -m api --html=report.html
```

## Troubleshooting

### Run with Debug Output
```bash
pytest -vv --tb=long --capture=no
```

### Run Single Test with Debugging
```bash
pytest -vv -s backend/tests/test_campaigns_api.py::TestCampaignCRUD::test_create_campaign
```

### Generate Detailed Report
```bash
pytest --html=report.html --self-contained-html --tb=short
```

## Test Data

All test data is managed in `conftest.py` fixtures:
- `test_campaign_data` - Campaign creation data
- `test_donation_data` - Donation details
- `test_payment_data` - Payment method credentials

## Extending Tests

To add new tests:

1. Create test class inheriting from no base (pytest convention)
2. Use provided fixtures: `authenticated_client`, `api_client`, `browser`
3. Add appropriate marker: `@pytest.mark.api`, `@pytest.mark.ui`, etc.
4. Follow naming: `test_<feature>_<scenario>`

Example:
```python
@pytest.mark.api
class TestNewFeature:
    def test_new_scenario(self, authenticated_client):
        response = authenticated_client.get('/endpoint')
        assert response.status_code == 200
```

## Next Steps

1. ✅ Run full test suite to validate implementation
2. ✅ Check coverage reports for gaps
3. ✅ Add custom assertions for business logic
4. ✅ Integrate with CI/CD pipeline
5. ✅ Generate performance reports

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Selenium Documentation](https://selenium.dev/documentation/)
- [Requests Documentation](https://requests.readthedocs.io/)
