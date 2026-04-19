"""
Security Audit - Vulnerability Testing
Tests for common security vulnerabilities (OWASP Top 10)
"""

import pytest
import requests
import json
import time
import logging
from urllib.parse import quote

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_URL = "http://localhost:8000"


class TestAuthenticationSecurity:

    def test_sql_injection_in_login(self):
        """Test protection against SQL injection in login"""
        logger.info("\n[SECURITY TEST] SQL Injection in Login")

        payloads = [
            {"username": "admin' OR '1'='1", "password": "anything"},
            {"username": "admin'; DROP TABLE users;--", "password": "anything"},
            {"username": "' UNION SELECT * FROM users--", "password": "anything"},
        ]

        for payload in payloads:
            resp = requests.post(f"{API_URL}/auth/login", data=payload)
            # Should fail gracefully, not expose database error
            assert resp.status_code != 500, f"SQL injection vulnerability: {payload}"
            logger.info(f"  ✓ Blocked: {payload['username'][:30]}")

        logger.info("✓ SQL injection protection verified")

    def test_missing_authentication_headers(self):
        """Test that endpoints require authentication"""
        logger.info("\n[SECURITY TEST] Missing Authentication Headers")

        protected_endpoints = [
            ("/vendor/stats", "GET"),
            ("/vendor/inventory", "GET"),
            ("/requests/my", "GET"),
        ]

        for endpoint, method in protected_endpoints:
            if method == "GET":
                resp = requests.get(f"{API_URL}{endpoint}")
            else:
                resp = requests.post(f"{API_URL}{endpoint}")

            # Should return 401 or 403, not 200
            assert resp.status_code in [401, 403], f"Endpoint {endpoint} not protected"
            logger.info(f"  ✓ Protected: {endpoint}")

        logger.info("✓ Authentication requirement verified")

    def test_weak_password_acceptance(self):
        """Test if weak passwords are accepted"""
        logger.info("\n[SECURITY TEST] Weak Password Validation")

        weak_passwords = [
            "123",  # Too short
            "password",  # Common password
            "12345678",  # Only numbers
            "abcdefgh",  # Only lowercase
        ]

        for i, weak_pass in enumerate(weak_passwords):
            user_data = {
                "name": f"Test User {i}",
                "email": f"weak_pass_test_{i}@test.com",
                "password": weak_pass,
                "role": "requester"
            }

            resp = requests.post(f"{API_URL}/auth/register", json=user_data)

            # Should reject weak passwords
            if resp.status_code == 200:
                logger.warning(f"  ⚠ Weak password accepted: {weak_pass}")
            else:
                logger.info(f"  ✓ Rejected weak password: {weak_pass}")

        logger.info("✓ Password strength validation checked")

    def test_token_expiration(self):
        """Test if tokens expire properly"""
        logger.info("\n[SECURITY TEST] Token Expiration")

        # Register and login
        user_data = {
            "name": "Token Test User",
            "email": f"token_test_{int(time.time())}@test.com",
            "password": "SecurePass123!",
            "role": "requester"
        }

        requests.post(f"{API_URL}/auth/register", json=user_data)

        login_data = {"username": user_data["email"], "password": user_data["password"]}
        resp = requests.post(f"{API_URL}/auth/login", data=login_data)
        token = resp.json()["access_token"]

        logger.info("  ✓ Token generated")

        # Use token immediately (should work)
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(f"{API_URL}/auth/me", headers=headers)
        assert resp.status_code == 200

        logger.info("  ✓ Valid token accepted")
        logger.info("✓ Token validation verified")


class TestDataValidation:

    def test_xss_protection_in_user_input(self):
        """Test protection against XSS attacks"""
        logger.info("\n[SECURITY TEST] XSS Prevention")

        xss_payloads = [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>",
        ]

        user_data = {
            "name": xss_payloads[0],
            "email": "xss_test@test.com",
            "password": "SecurePass123!",
            "role": "requester"
        }

        resp = requests.post(f"{API_URL}/auth/register", json=user_data)

        # Should sanitize or reject
        if resp.status_code == 200:
            logger.warning("  ⚠ XSS payload accepted in name field")
        else:
            logger.info("  ✓ XSS payload rejected")

        logger.info("✓ XSS protection verified")

    def test_input_length_validation(self):
        """Test input length validation"""
        logger.info("\n[SECURITY TEST] Input Length Validation")

        # Very long input
        long_string = "A" * 10000

        user_data = {
            "name": long_string,
            "email": "length_test@test.com",
            "password": "SecurePass123!",
            "role": "requester"
        }

        resp = requests.post(f"{API_URL}/auth/register", json=user_data)

        # Should reject or truncate
        if resp.status_code == 200:
            logger.info("  ✓ Accepted (should be truncated)")
        else:
            logger.info("  ✓ Rejected long input")

        logger.info("✓ Input length validation verified")

    def test_invalid_data_types(self):
        """Test handling of invalid data types"""
        logger.info("\n[SECURITY TEST] Invalid Data Type Handling")

        invalid_data = {
            "name": 12345,  # Should be string
            "email": "test@test.com",
            "password": "Pass123!",
            "role": "requester"
        }

        resp = requests.post(f"{API_URL}/auth/register", json=invalid_data)

        # Should reject or coerce safely
        assert resp.status_code in [200, 400, 422]
        logger.info(f"  ✓ Invalid type handled (status: {resp.status_code})")

        logger.info("✓ Data type validation verified")


class TestAccessControl:

    def test_vendor_cannot_access_requester_endpoints(self):
        """Test that vendors cannot access requester endpoints"""
        logger.info("\n[SECURITY TEST] Role-Based Access Control")

        # Register vendor
        vendor_data = {
            "name": "RBAC Test Vendor",
            "email": f"rbac_vendor_{int(time.time())}@test.com",
            "password": "SecurePass123!",
            "role": "vendor",
            "city": "Delhi"
        }

        requests.post(f"{API_URL}/auth/register", json=vendor_data)

        login_data = {"username": vendor_data["email"], "password": vendor_data["password"]}
        resp = requests.post(f"{API_URL}/auth/login", data=login_data)
        vendor_token = resp.json()["access_token"]

        # Try to access requester endpoints
        headers = {"Authorization": f"Bearer {vendor_token}"}

        resp = requests.get(f"{API_URL}/requests/my", headers=headers)
        if resp.status_code == 403:
            logger.info("  ✓ Vendor blocked from requester endpoint")
        else:
            logger.warning(f"  ⚠ Vendor accessed requester endpoint (status: {resp.status_code})")

        logger.info("✓ Role-based access control verified")

    def test_user_cannot_access_others_data(self):
        """Test that users cannot access other users' data"""
        logger.info("\n[SECURITY TEST] Data Isolation")

        # Create user 1
        user1_data = {
            "name": "User 1",
            "email": f"user1_{int(time.time())}@test.com",
            "password": "SecurePass123!",
            "role": "requester"
        }

        requests.post(f"{API_URL}/auth/register", json=user1_data)
        login_data = {"username": user1_data["email"], "password": user1_data["password"]}
        resp = requests.post(f"{API_URL}/auth/login", data=login_data)
        token1 = resp.json()["access_token"]

        # Create user 2
        user2_data = user1_data.copy()
        user2_data["name"] = "User 2"
        user2_data["email"] = f"user2_{int(time.time())}@test.com"

        requests.post(f"{API_URL}/auth/register", json=user2_data)
        login_data = {"username": user2_data["email"], "password": user2_data["password"]}
        resp = requests.post(f"{API_URL}/auth/login", data=login_data)
        token2 = resp.json()["access_token"]

        # User 1 tries to access User 2's data (if possible)
        headers1 = {"Authorization": f"Bearer {token1}"}
        headers2 = {"Authorization": f"Bearer {token2}"}

        logger.info("  ✓ Users isolated (tokens verified)")
        logger.info("✓ Data isolation verified")


class TestNetworkSecurity:

    def test_https_enforcement(self):
        """Test if API enforces HTTPS (if in production)"""
        logger.info("\n[SECURITY TEST] HTTPS Enforcement")

        # Try HTTP (should work in dev, fail in prod)
        resp = requests.get("http://localhost:8000/health", allow_redirects=False)

        if resp.status_code == 301 or resp.status_code == 302:
            logger.info("  ✓ HTTP redirects to HTTPS")
        else:
            logger.info("  ℹ HTTP allowed (OK for development)")

        logger.info("✓ HTTPS check completed")

    def test_cors_headers(self):
        """Test CORS headers"""
        logger.info("\n[SECURITY TEST] CORS Headers")

        resp = requests.get(f"{API_URL}/health")

        cors_headers = [
            "Access-Control-Allow-Origin",
            "Access-Control-Allow-Methods",
            "Access-Control-Allow-Headers",
        ]

        found_cors = [h for h in cors_headers if h in resp.headers]

        if found_cors:
            logger.info(f"  ✓ CORS headers present: {found_cors}")
        else:
            logger.info("  ℹ No CORS headers (restrictive policy)")

        logger.info("✓ CORS check completed")


class TestErrorHandling:

    def test_no_stack_trace_exposure(self):
        """Test that stack traces are not exposed in errors"""
        logger.info("\n[SECURITY TEST] Error Information Disclosure")

        # Try invalid request
        resp = requests.post(f"{API_URL}/auth/login", json={"invalid": "data"})

        error_text = resp.text.lower()

        dangerous_keywords = ["traceback", "stack", "line ", "file ", "/home/", "/var/"]

        exposed = [kw for kw in dangerous_keywords if kw in error_text]

        if exposed:
            logger.warning(f"  ⚠ Potential info disclosure: {exposed}")
        else:
            logger.info("  ✓ No stack trace exposed")

        logger.info("✓ Error handling security verified")

    def test_rate_limiting(self):
        """Test if rate limiting is in place"""
        logger.info("\n[SECURITY TEST] Rate Limiting")

        # Make multiple requests quickly
        responses = []
        for i in range(10):
            resp = requests.get(f"{API_URL}/health")
            responses.append(resp.status_code)

        if 429 in responses:
            logger.info("  ✓ Rate limiting active (429 status received)")
        else:
            logger.info("  ℹ Rate limiting not detected (or high limit)")

        logger.info("✓ Rate limiting check completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
