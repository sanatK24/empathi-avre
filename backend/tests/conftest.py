"""
Pytest configuration and fixtures for E2E testing
"""
import pytest
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os
from dotenv import load_dotenv

load_dotenv()

# Test Configuration
API_BASE_URL = os.getenv('TEST_API_URL', 'http://localhost:8000')
WEB_BASE_URL = os.getenv('TEST_WEB_URL', 'http://localhost:5173')
CHROME_HEADLESS = os.getenv('CHROME_HEADLESS', 'true').lower() == 'true'

# Test Users
TEST_USERS = {
    'requester': {
        'email': 'test.requester@example.com',
        'password': 'testpass123!',
        'name': 'Test Requester',
        'role': 'requester'
    },
    'admin': {
        'email': 'test.admin@example.com',
        'password': 'testpass123!',
        'name': 'Test Admin',
        'role': 'admin'
    }
}

class APIClient:
    """Client for API testing"""
    def __init__(self, base_url=API_BASE_URL):
        self.base_url = base_url
        self.token = None
        self.headers = {'Content-Type': 'application/json'}

    def set_token(self, token):
        """Set authentication token"""
        self.token = token
        self.headers['Authorization'] = f'Bearer {token}'

    def request(self, method, endpoint, **kwargs):
        """Make HTTP request"""
        url = f'{self.base_url}{endpoint}'
        response = requests.request(method, url, headers=self.headers, **kwargs)
        return response

    def get(self, endpoint):
        return self.request('GET', endpoint)

    def post(self, endpoint, json=None):
        return self.request('POST', endpoint, json=json)

    def put(self, endpoint, json=None):
        return self.request('PUT', endpoint, json=json)

    def delete(self, endpoint):
        return self.request('DELETE', endpoint)

    def login(self, email, password):
        """Login and get token"""
        data = {'username': email, 'password': password}
        response = self.request('POST', '/auth/login', data=data)
        if response.status_code == 200:
            token = response.json().get('access_token')
            self.set_token(token)
            return token
        raise Exception(f'Login failed: {response.text}')

@pytest.fixture
def api_client():
    """Fixture for API client"""
    return APIClient()

@pytest.fixture
def authenticated_client(api_client):
    """Fixture for authenticated API client"""
    api_client.login(TEST_USERS['requester']['email'], TEST_USERS['requester']['password'])
    return api_client

@pytest.fixture
def admin_client(api_client):
    """Fixture for admin API client"""
    api_client.login(TEST_USERS['admin']['email'], TEST_USERS['admin']['password'])
    return api_client

@pytest.fixture
def browser():
    """Fixture for Selenium WebDriver"""
    options = webdriver.ChromeOptions()

    if CHROME_HEADLESS:
        options.add_argument('--headless')

    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')

    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(10)

    yield driver

    driver.quit()

@pytest.fixture
def wait(browser):
    """Fixture for WebDriverWait"""
    return WebDriverWait(browser, 10)

@pytest.fixture
def authenticated_browser(browser, wait):
    """Fixture for authenticated browser session"""
    # Navigate to login page
    browser.get(f'{WEB_BASE_URL}/login')
    wait.until(EC.presence_of_element_located((By.NAME, 'email')))

    # Fill login form
    browser.find_element(By.NAME, 'email').send_keys(TEST_USERS['requester']['email'])
    browser.find_element(By.NAME, 'password').send_keys(TEST_USERS['requester']['password'])
    browser.find_element(By.XPATH, '//button[@type="submit"]').click()

    # Wait for redirect
    wait.until(EC.url_changes(f'{WEB_BASE_URL}/login'))
    time.sleep(1)

    return browser

@pytest.fixture(scope='session')
def test_campaign_data():
    """Test campaign data"""
    return {
        'title': 'E2E Test Campaign',
        'description': 'This is a test campaign for E2E testing',
        'category': 'medical',
        'city': 'Test City',
        'goal_amount': 50000,
        'urgency_level': 'high'
    }

@pytest.fixture(scope='session')
def test_donation_data():
    """Test donation data"""
    return {
        'amount': 1000,
        'anonymous': False,
        'message': 'Great campaign!'
    }

@pytest.fixture(scope='session')
def test_payment_data():
    """Test payment data for different methods"""
    return {
        'upi': {
            'upi_id': 'testuser@upi',
            'payment_method': 'upi'
        },
        'card': {
            'card_number': '4111111111111111',
            'expiry': '12/25',
            'cvv': '123',
            'payment_method': 'card'
        },
        'wallet': {
            'phone': '9876543210',
            'payment_method': 'wallet'
        },
        'bank': {
            'account_number': '1234567890123',
            'payment_method': 'bank'
        }
    }

# Markers for test categorization
def pytest_configure(config):
    config.addinivalue_line('markers', 'api: API endpoint tests')
    config.addinivalue_line('markers', 'ui: UI/Selenium tests')
    config.addinivalue_line('markers', 'integration: Integration tests')
    config.addinivalue_line('markers', 'slow: Slow running tests')
    config.addinivalue_line('markers', 'smoke: Smoke tests')
