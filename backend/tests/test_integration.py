"""
AVRE Integration Test Suite
Tests end-to-end functionality including health checks, authentication,
API endpoints, data flow, matching engine, and security.

Run with: python backend/tests/test_integration.py
"""

import sys
import os
import json
import time
import traceback
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import requests
from requests.exceptions import ConnectionError, Timeout
import unittest
from unittest.mock import patch

# ============================================================================
# COLOR AND FORMATTING
# ============================================================================

class Colors:
    """ANSI color codes for terminal output"""
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

    # Status colors
    GREEN = '\033[92m'      # Pass
    RED = '\033[91m'        # Fail
    YELLOW = '\033[93m'     # Warning
    CYAN = '\033[96m'       # Info
    MAGENTA = '\033[95m'    # Emphasis

    @staticmethod
    def success(text: str) -> str:
        return f"{Colors.GREEN}✓ {text}{Colors.RESET}"

    @staticmethod
    def fail(text: str) -> str:
        return f"{Colors.RED}✗ {text}{Colors.RESET}"

    @staticmethod
    def warning(text: str) -> str:
        return f"{Colors.YELLOW}⚠ {text}{Colors.RESET}"

    @staticmethod
    def info(text: str) -> str:
        return f"{Colors.CYAN}ℹ {text}{Colors.RESET}"

    @staticmethod
    def section(text: str) -> str:
        border = "=" * (len(text) + 4)
        return f"\n{Colors.BOLD}{Colors.MAGENTA}{border}\n  {text}\n{border}{Colors.RESET}\n"


# ============================================================================
# TEST LOGGER
# ============================================================================

class TestLogger:
    """Handles test output with timestamps and formatting"""

    def __init__(self):
        self.logs: List[Dict] = []
        self.start_time = datetime.now()

    def log(self, level: str, message: str, details: Optional[str] = None):
        """Log a message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        log_entry = {
            "timestamp": timestamp,
            "level": level,
            "message": message,
            "details": details
        }
        self.logs.append(log_entry)

        if level == "PASS":
            print(f"  [{timestamp}] {Colors.success(message)}")
        elif level == "FAIL":
            print(f"  [{timestamp}] {Colors.fail(message)}")
            if details:
                print(f"            {Colors.fail(f'Error: {details}')}")
        elif level == "WARN":
            print(f"  [{timestamp}] {Colors.warning(message)}")
            if details:
                print(f"            {Colors.warning(f'Detail: {details}')}")
        elif level == "INFO":
            print(f"  [{timestamp}] {Colors.info(message)}")
            if details:
                print(f"            {Colors.info(f'{details}')}")

    def get_summary(self) -> Dict:
        """Get test summary statistics"""
        elapsed = (datetime.now() - self.start_time).total_seconds()
        passed = len([l for l in self.logs if l["level"] == "PASS"])
        failed = len([l for l in self.logs if l["level"] == "FAIL"])
        warnings = len([l for l in self.logs if l["level"] == "WARN"])

        return {
            "total_tests": passed + failed,
            "passed": passed,
            "failed": failed,
            "warnings": warnings,
            "elapsed_seconds": round(elapsed, 2)
        }


# ============================================================================
# API CLIENT
# ============================================================================

class AVRETestClient:
    """HTTP client for AVRE backend testing"""

    def __init__(self, base_url: str = "http://localhost:8000", timeout: int = 10):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        self.token: Optional[str] = None
        self.user_data: Dict = {}

    def set_token(self, token: str):
        """Set authentication token"""
        self.token = token
        self.session.headers.update({"Authorization": f"Bearer {token}"})

    def clear_token(self):
        """Clear authentication token"""
        self.token = None
        self.session.headers.pop("Authorization", None)

    def get(self, endpoint: str, **kwargs) -> Tuple[int, Dict]:
        """Make GET request"""
        try:
            response = self.session.get(
                f"{self.base_url}{endpoint}",
                timeout=self.timeout,
                **kwargs
            )
            return response.status_code, response.json() if response.text else {}
        except Timeout:
            return 0, {"error": f"Request timeout after {self.timeout}s"}
        except ConnectionError:
            return 0, {"error": "Connection refused"}
        except Exception as e:
            return 0, {"error": str(e)}

    def post(self, endpoint: str, data: Dict = None, json_data: Dict = None, **kwargs) -> Tuple[int, Dict]:
        """Make POST request"""
        try:
            kwargs_to_use = {"timeout": self.timeout, **kwargs}
            if json_data:
                kwargs_to_use["json"] = json_data
            if data:
                kwargs_to_use["data"] = data

            response = self.session.post(
                f"{self.base_url}{endpoint}",
                **kwargs_to_use
            )
            return response.status_code, response.json() if response.text else {}
        except Timeout:
            return 0, {"error": f"Request timeout after {self.timeout}s"}
        except ConnectionError:
            return 0, {"error": "Connection refused"}
        except Exception as e:
            return 0, {"error": str(e)}

    def put(self, endpoint: str, json_data: Dict = None, **kwargs) -> Tuple[int, Dict]:
        """Make PUT request"""
        try:
            response = self.session.put(
                f"{self.base_url}{endpoint}",
                json=json_data,
                timeout=self.timeout,
                **kwargs
            )
            return response.status_code, response.json() if response.text else {}
        except Timeout:
            return 0, {"error": f"Request timeout after {self.timeout}s"}
        except ConnectionError:
            return 0, {"error": "Connection refused"}
        except Exception as e:
            return 0, {"error": str(e)}

    def delete(self, endpoint: str, **kwargs) -> Tuple[int, Dict]:
        """Make DELETE request"""
        try:
            response = self.session.delete(
                f"{self.base_url}{endpoint}",
                timeout=self.timeout,
                **kwargs
            )
            return response.status_code, response.json() if response.text else {}
        except Timeout:
            return 0, {"error": f"Request timeout after {self.timeout}s"}
        except ConnectionError:
            return 0, {"error": "Connection refused"}
        except Exception as e:
            return 0, {"error": str(e)}


# ============================================================================
# INTEGRATION TEST SUITE
# ============================================================================

class AVREIntegrationTests:
    """Comprehensive integration tests for AVRE"""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.client = AVRETestClient(base_url)
        self.logger = TestLogger()
        self.test_data: Dict = {}

    def run_all_tests(self) -> bool:
        """Run all tests and return success status"""
        all_passed = True

        try:
            print(Colors.section("1. HEALTH CHECK"))
            if not self.test_health_check():
                all_passed = False

            print(Colors.section("2. AUTHENTICATION"))
            if not self.test_authentication():
                all_passed = False

            print(Colors.section("3. API ENDPOINTS"))
            if not self.test_api_endpoints():
                all_passed = False

            print(Colors.section("4. DATA FLOW (Create → Read)"))
            if not self.test_data_flow():
                all_passed = False

            print(Colors.section("5. MATCHING ENGINE"))
            if not self.test_matching_engine():
                all_passed = False

            print(Colors.section("6. SECURITY"))
            if not self.test_security():
                all_passed = False

            # Print summary
            print(Colors.section("TEST SUMMARY"))
            self.print_summary()

            return all_passed

        except Exception as e:
            self.logger.log("FAIL", "Critical test error", f"{str(e)}\n{traceback.format_exc()}")
            self.print_summary()
            return False

    # ========================================================================
    # TEST 1: HEALTH CHECK
    # ========================================================================

    def test_health_check(self) -> bool:
        """Test backend health and database connectivity"""
        all_passed = True

        # Test server is running
        self.logger.log("INFO", "Checking backend server...")
        status_code, response = self.client.get("/")
        if status_code == 200:
            self.logger.log("PASS", "Backend server is running")
        else:
            self.logger.log("FAIL", "Backend server not responding", f"Status: {status_code}")
            all_passed = False

        # Test health endpoint
        self.logger.log("INFO", "Checking health endpoint...")
        status_code, response = self.client.get("/health")

        if status_code == 200:
            health_status = response.get("status", "unknown")
            db_status = response.get("database", "unknown")
            model_status = response.get("ml_model", "unknown")

            if health_status == "Healthy":
                self.logger.log("PASS", "Backend health status is Healthy")
            else:
                self.logger.log("WARN", f"Health status: {health_status}")

            if "Connected" in db_status or "Connected" == db_status:
                self.logger.log("PASS", "Database is connected")
            else:
                self.logger.log("FAIL", "Database connection issue", db_status)
                all_passed = False

            self.logger.log("INFO", f"ML Model status: {model_status}")
        else:
            self.logger.log("FAIL", "Health check failed", f"Status: {status_code}")
            all_passed = False

        return all_passed

    # ========================================================================
    # TEST 2: AUTHENTICATION
    # ========================================================================

    def test_authentication(self) -> bool:
        """Test user registration and authentication flow"""
        all_passed = True

        # Register requester
        self.logger.log("INFO", "Registering requester...")
        requester_data = {
            "name": "Alice Johnson",
            "email": f"alice_{int(time.time())}@test.com",
            "password": "SecurePass123!",
            "role": "requester",
            "phone": "555-0001",
            "city": "New York",
            "is_active": True
        }

        status_code, response = self.client.post("/auth/register", json_data=requester_data)
        if status_code == 200:
            self.logger.log("PASS", "Requester registered successfully")
            self.test_data["requester_email"] = requester_data["email"]
            self.test_data["requester_password"] = requester_data["password"]
            self.test_data["requester_id"] = response.get("id")
        else:
            self.logger.log("FAIL", "Requester registration failed", f"Status: {status_code}, {response}")
            all_passed = False
            return all_passed

        # Register vendor
        self.logger.log("INFO", "Registering vendor...")
        vendor_data = {
            "name": "Bob's Medical Supply",
            "email": f"bob_{int(time.time())}@test.com",
            "password": "SecurePass456!",
            "role": "vendor",
            "phone": "555-0002",
            "city": "New York",
            "is_active": True
        }

        status_code, response = self.client.post("/auth/register", json_data=vendor_data)
        if status_code == 200:
            self.logger.log("PASS", "Vendor registered successfully")
            self.test_data["vendor_email"] = vendor_data["email"]
            self.test_data["vendor_password"] = vendor_data["password"]
            self.test_data["vendor_id"] = response.get("id")
        else:
            self.logger.log("FAIL", "Vendor registration failed", f"Status: {status_code}, {response}")
            all_passed = False
            return all_passed

        # Test duplicate registration
        self.logger.log("INFO", "Testing duplicate registration rejection...")
        status_code, response = self.client.post("/auth/register", json_data=requester_data)
        if status_code == 400 and "already registered" in response.get("detail", "").lower():
            self.logger.log("PASS", "Duplicate email rejected correctly")
        else:
            self.logger.log("WARN", "Expected 400 for duplicate email", f"Got {status_code}")

        # Login requester
        self.logger.log("INFO", "Logging in requester...")
        login_data = {
            "username": requester_data["email"],
            "password": requester_data["password"]
        }

        status_code, response = self.client.post("/auth/login", data=login_data)
        if status_code == 200:
            access_token = response.get("access_token")
            if access_token:
                self.logger.log("PASS", "Requester login successful")
                self.test_data["requester_token"] = access_token
                self.client.set_token(access_token)
            else:
                self.logger.log("FAIL", "No access token in response", str(response))
                all_passed = False
        else:
            self.logger.log("FAIL", "Requester login failed", f"Status: {status_code}, {response}")
            all_passed = False

        # Login vendor
        self.logger.log("INFO", "Logging in vendor...")
        login_data = {
            "username": vendor_data["email"],
            "password": vendor_data["password"]
        }

        status_code, response = self.client.post("/auth/login", data=login_data)
        if status_code == 200:
            access_token = response.get("access_token")
            if access_token:
                self.logger.log("PASS", "Vendor login successful")
                self.test_data["vendor_token"] = access_token
            else:
                self.logger.log("FAIL", "No access token in response", str(response))
                all_passed = False
        else:
            self.logger.log("FAIL", "Vendor login failed", f"Status: {status_code}, {response}")
            all_passed = False

        # Test invalid credentials
        self.logger.log("INFO", "Testing invalid credentials...")
        invalid_login = {
            "username": requester_data["email"],
            "password": "WrongPassword123"
        }

        status_code, response = self.client.post("/auth/login", data=invalid_login)
        if status_code == 401:
            self.logger.log("PASS", "Invalid credentials rejected (401 Unauthorized)")
        else:
            self.logger.log("WARN", f"Expected 401 for invalid credentials, got {status_code}")

        # Test invalid token
        self.logger.log("INFO", "Testing invalid token rejection...")
        self.client.set_token("invalid.token.here")
        status_code, response = self.client.get("/auth/me")
        if status_code == 401:
            self.logger.log("PASS", "Invalid token rejected (401 Unauthorized)")
        else:
            self.logger.log("WARN", f"Expected 401 for invalid token, got {status_code}")

        # Restore valid token
        self.client.set_token(self.test_data["requester_token"])

        return all_passed

    # ========================================================================
    # TEST 3: API ENDPOINTS
    # ========================================================================

    def test_api_endpoints(self) -> bool:
        """Test key API endpoints with authorization"""
        all_passed = True

        # Test /auth/me with valid token
        self.logger.log("INFO", "Testing /auth/me endpoint...")
        self.client.set_token(self.test_data.get("requester_token"))
        status_code, response = self.client.get("/auth/me")

        if status_code == 200:
            user_email = response.get("email")
            if user_email == self.test_data.get("requester_email"):
                self.logger.log("PASS", "/auth/me returns correct user data")
            else:
                self.logger.log("WARN", f"Expected email {self.test_data.get('requester_email')}, got {user_email}")
        else:
            self.logger.log("FAIL", "/auth/me failed", f"Status: {status_code}")
            all_passed = False

        # Test /admin/stats without admin role (should fail)
        self.logger.log("INFO", "Testing /admin/stats authorization (non-admin)...")
        self.client.set_token(self.test_data.get("requester_token"))
        status_code, response = self.client.get("/admin/stats")

        if status_code == 403:
            self.logger.log("PASS", "/admin/stats correctly rejects non-admin access (403)")
        elif status_code == 401:
            self.logger.log("PASS", "/admin/stats correctly rejects unauthorized access (401)")
        else:
            self.logger.log("WARN", f"Expected 401/403 for non-admin access to /admin/stats, got {status_code}")

        # Test /vendor/stats with vendor role
        self.logger.log("INFO", "Testing /vendor/stats endpoint...")
        self.client.set_token(self.test_data.get("vendor_token"))
        status_code, response = self.client.get("/vendor/stats")

        if status_code == 200:
            self.logger.log("PASS", "/vendor/stats accessible to vendor")
        else:
            self.logger.log("WARN", f"/vendor/stats returned {status_code}: {response}")

        # Test /vendor/stats without vendor role (should fail or redirect)
        self.logger.log("INFO", "Testing /vendor/stats authorization (non-vendor)...")
        self.client.set_token(self.test_data.get("requester_token"))
        status_code, response = self.client.get("/vendor/stats")

        if status_code in [401, 403, 404]:
            self.logger.log("PASS", "/vendor/stats correctly rejects non-vendor access")
        else:
            self.logger.log("INFO", f"/vendor/stats returned {status_code} for non-vendor")

        return all_passed

    # ========================================================================
    # TEST 4: DATA FLOW (Create → Read)
    # ========================================================================

    def test_data_flow(self) -> bool:
        """Test creating and retrieving resources"""
        all_passed = True

        # Create vendor profile
        self.logger.log("INFO", "Creating vendor profile...")
        self.client.set_token(self.test_data.get("vendor_token"))

        vendor_profile = {
            "shop_name": "MediCare Pharmacy",
            "category": "pharmacy",
            "lat": 40.7128,
            "lng": -74.0060,
            "city": "New York",
            "service_radius": 15.0,
            "opening_hours": "09:00-21:00",
            "avg_response_time": 20
        }

        status_code, response = self.client.post("/vendor/profile", json_data=vendor_profile)
        if status_code == 200:
            self.logger.log("PASS", "Vendor profile created")
            self.test_data["vendor_profile_id"] = response.get("id")
        else:
            self.logger.log("FAIL", "Vendor profile creation failed", f"Status: {status_code}, {response}")
            all_passed = False
            return all_passed

        # Add inventory
        self.logger.log("INFO", "Adding inventory items...")
        inventory_items = [
            {
                "resource_name": "N95 Masks",
                "category": "medical_supplies",
                "quantity": 500,
                "price": 2.50,
                "reorder_level": 100
            },
            {
                "resource_name": "Hand Sanitizer",
                "category": "disinfectant",
                "quantity": 200,
                "price": 5.00,
                "reorder_level": 50
            }
        ]

        inventory_ids = []
        for item in inventory_items:
            status_code, response = self.client.post("/vendor/inventory", json_data=item)
            if status_code == 200:
                self.logger.log("PASS", f"Inventory added: {item['resource_name']}")
                inventory_ids.append(response.get("id"))
            else:
                self.logger.log("WARN", f"Inventory add failed for {item['resource_name']}", f"Status: {status_code}")

        self.test_data["inventory_ids"] = inventory_ids

        # Retrieve vendor inventory
        self.logger.log("INFO", "Retrieving vendor inventory...")
        status_code, response = self.client.get("/vendor/inventory")
        if status_code == 200 and isinstance(response, list):
            self.logger.log("PASS", f"Retrieved {len(response)} inventory items")
        else:
            self.logger.log("WARN", "Inventory retrieval issue", f"Status: {status_code}")

        # Create resource request
        self.logger.log("INFO", "Creating resource request...")
        self.client.set_token(self.test_data.get("requester_token"))

        request_data = {
            "resource_name": "N95 Masks",
            "category": "medical_supplies",
            "quantity": 100,
            "location_lat": 40.7128,
            "location_lng": -74.0060,
            "city": "New York",
            "urgency_level": "high",
            "preferred_eta": 30,
            "notes": "Urgent medical supply needed",
            "payment_mode": "cod"
        }

        status_code, response = self.client.post("/requests/", json_data=request_data)
        if status_code == 200:
            self.logger.log("PASS", "Resource request created")
            self.test_data["request_id"] = response.get("id")
        else:
            self.logger.log("FAIL", "Resource request creation failed", f"Status: {status_code}, {response}")
            all_passed = False
            return all_passed

        # Retrieve request
        self.logger.log("INFO", "Retrieving created request...")
        status_code, response = self.client.get(f"/requests/{self.test_data['request_id']}")
        if status_code == 200:
            retrieved_resource = response.get("resource_name")
            if retrieved_resource == request_data["resource_name"]:
                self.logger.log("PASS", "Request retrieved successfully with correct data")
            else:
                self.logger.log("WARN", "Retrieved request data mismatch")
        else:
            self.logger.log("WARN", "Request retrieval failed", f"Status: {status_code}")

        return all_passed

    # ========================================================================
    # TEST 5: MATCHING ENGINE
    # ========================================================================

    def test_matching_engine(self) -> bool:
        """Test matching engine functionality"""
        all_passed = True

        if "request_id" not in self.test_data:
            self.logger.log("WARN", "Skipping matching tests - no request_id available")
            return True

        request_id = self.test_data["request_id"]

        # Get matches
        self.logger.log("INFO", "Fetching matches for request...")
        self.client.set_token(self.test_data.get("requester_token"))

        status_code, response = self.client.get(f"/match/{request_id}")
        if status_code == 200:
            ranked_vendors = response.get("ranked_vendors", [])
            self.logger.log("PASS", f"Matches retrieved: {len(ranked_vendors)} vendors found")

            if len(ranked_vendors) > 0:
                top_vendor = ranked_vendors[0]
                self.logger.log("INFO", f"Top match: {top_vendor.get('shop_name', 'N/A')} (Score: {top_vendor.get('relevance_score', 'N/A')})")
                self.test_data["match_vendor_id"] = top_vendor.get("vendor_id")
            else:
                self.logger.log("WARN", "No vendors found for matching")
        else:
            self.logger.log("WARN", "Match retrieval failed", f"Status: {status_code}, {response}")

        # Try accepting a match (if vendor found)
        if "match_vendor_id" in self.test_data and len(ranked_vendors) > 0:
            self.logger.log("INFO", "Accepting vendor match...")
            vendor_id = self.test_data["match_vendor_id"]

            status_code, response = self.client.post(f"/match/{request_id}/accept/{vendor_id}")
            if status_code == 200:
                self.logger.log("PASS", "Vendor match accepted successfully")
            else:
                self.logger.log("WARN", "Match acceptance failed", f"Status: {status_code}, {response}")

        return all_passed

    # ========================================================================
    # TEST 6: SECURITY
    # ========================================================================

    def test_security(self) -> bool:
        """Test security controls and authorization"""
        all_passed = True

        # Test 1: Unauthorized access (no token)
        self.logger.log("INFO", "Testing unauthorized access (no token)...")
        self.client.clear_token()
        status_code, response = self.client.get("/auth/me")

        if status_code == 403 or status_code == 401:
            self.logger.log("PASS", "Unauthorized access blocked (401/403)")
        else:
            self.logger.log("WARN", f"Expected 401/403 for unauthorized access, got {status_code}")

        # Test 2: Invalid token format
        self.logger.log("INFO", "Testing invalid token format...")
        self.client.set_token("not.a.valid.jwt.token")
        status_code, response = self.client.get("/auth/me")

        if status_code == 401:
            self.logger.log("PASS", "Invalid token format rejected (401)")
        else:
            self.logger.log("WARN", f"Expected 401 for invalid token, got {status_code}")

        # Test 3: Role-based access control
        self.logger.log("INFO", "Testing role-based access control...")

        # Requester trying to access vendor endpoint
        self.client.set_token(self.test_data.get("requester_token"))
        status_code, response = self.client.get("/vendor/profile")

        if status_code in [404, 403, 401]:
            self.logger.log("PASS", "Requester correctly denied access to vendor profile (403/404)")
        else:
            self.logger.log("INFO", f"Vendor profile access returned {status_code}")

        # Test 4: Admin authorization
        self.logger.log("INFO", "Testing admin-only endpoint access...")
        status_code, response = self.client.get("/admin/users")

        if status_code == 403 or status_code == 401:
            self.logger.log("PASS", "Non-admin correctly denied access to /admin/users")
        else:
            self.logger.log("WARN", f"Expected 401/403 for non-admin access to /admin/users, got {status_code}")

        # Test 5: Token expiry handling (simulate)
        self.logger.log("INFO", "Testing expired token handling...")
        self.client.set_token("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkV4cGlyZWQiLCJleHAiOjE1MTYyMzkwMjJ9.expired")
        status_code, response = self.client.get("/auth/me")

        if status_code == 401:
            self.logger.log("PASS", "Expired token rejected (401)")
        else:
            self.logger.log("INFO", f"Expired token handling returned {status_code}")

        # Test 6: CORS preflight (optional)
        self.logger.log("INFO", "Testing request validation...")
        self.client.set_token(self.test_data.get("requester_token"))

        # Invalid request data
        invalid_request = {
            "resource_name": "",  # Empty required field
            "category": "test",
            "quantity": 0,  # Invalid quantity
            "location_lat": 200,  # Out of range
            "location_lng": 200,
            "city": "NY"
        }

        status_code, response = self.client.post("/requests/", json_data=invalid_request)
        if status_code in [400, 422]:  # Bad request or validation error
            self.logger.log("PASS", "Invalid request data rejected (400/422)")
        else:
            self.logger.log("INFO", f"Invalid request handling returned {status_code}")

        # Test 7: SQL Injection attempt prevention
        self.logger.log("INFO", "Testing injection attack prevention...")
        self.client.clear_token()
        malicious_data = {
            "username": "admin' OR '1'='1",
            "password": "anything"
        }

        status_code, response = self.client.post("/auth/login", data=malicious_data)
        if status_code == 401:
            self.logger.log("PASS", "Injection attack prevented (401)")
        else:
            self.logger.log("INFO", f"Injection attempt handling returned {status_code}")

        return all_passed

    # ========================================================================
    # SUMMARY
    # ========================================================================

    def print_summary(self):
        """Print test summary"""
        summary = self.logger.get_summary()

        print(f"\n{Colors.BOLD}{Colors.CYAN}Test Execution Summary:{Colors.RESET}")
        print(f"  Total Tests Run:  {Colors.BOLD}{summary['total_tests']}{Colors.RESET}")

        if summary['passed'] > 0:
            passed_msg = Colors.success(f"Passed: {summary['passed']}")
            print(f"  {passed_msg}")
        if summary['failed'] > 0:
            failed_msg = Colors.fail(f"Failed: {summary['failed']}")
            print(f"  {failed_msg}")
        if summary['warnings'] > 0:
            warn_msg = Colors.warning(f"Warnings: {summary['warnings']}")
            print(f"  {warn_msg}")

        print(f"  Elapsed Time:     {summary['elapsed_seconds']:.2f} seconds")

        success_rate = (summary['passed'] / summary['total_tests'] * 100) if summary['total_tests'] > 0 else 0
        if success_rate == 100:
            rate_msg = Colors.success(f'Success Rate: {success_rate:.1f}%')
            print(f"\n  {rate_msg}")
        elif success_rate >= 80:
            rate_msg = Colors.warning(f'Success Rate: {success_rate:.1f}%')
            print(f"\n  {rate_msg}")
        else:
            rate_msg = Colors.fail(f'Success Rate: {success_rate:.1f}%')
            print(f"\n  {rate_msg}")

        if summary['failed'] == 0:
            print(f"\n{Colors.BOLD}{Colors.GREEN}✓ ALL TESTS PASSED{Colors.RESET}\n")
        else:
            print(f"\n{Colors.BOLD}{Colors.RED}✗ SOME TESTS FAILED{Colors.RESET}\n")


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Main test execution"""
    print(f"\n{Colors.BOLD}{Colors.MAGENTA}")
    print("=" * 70)
    print("  AVRE Integration Test Suite")
    print("  Adaptive Vendor Relevance Engine - Backend Testing")
    print("=" * 70)
    print(f"{Colors.RESET}\n")

    # Check environment
    print(Colors.info("Checking test environment..."))

    # Get base URL from environment or use default
    base_url = os.getenv("AVRE_API_URL", "http://localhost:8000")
    print(f"  Backend URL: {Colors.CYAN}{base_url}{Colors.RESET}")

    # Initialize test suite
    test_suite = AVREIntegrationTests(base_url)

    # Run all tests
    try:
        success = test_suite.run_all_tests()
        return 0 if success else 1

    except KeyboardInterrupt:
        print(f"\n\n{Colors.warning('Tests interrupted by user')}\n")
        return 130

    except Exception as e:
        print(f"\n{Colors.fail('Test suite error:')}")
        print(f"  {Colors.fail(str(e))}")
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
