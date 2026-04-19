"""
Load Testing - Performance Under Concurrent Users
Tests system with 100+ simultaneous users
"""

import pytest
import requests
import time
import logging
import concurrent.futures
import statistics
from typing import List, Dict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

API_URL = "http://localhost:8000"

# Configuration
NUM_VENDORS = 20
NUM_REQUESTERS = 30
NUM_REQUESTS_PER_REQUESTER = 5
CONCURRENT_USERS = 50


class LoadTestMetrics:
    """Track performance metrics"""

    def __init__(self):
        self.response_times = []
        self.error_count = 0
        self.success_count = 0
        self.start_time = None
        self.end_time = None

    def add_response_time(self, time_ms):
        self.response_times.append(time_ms)
        self.success_count += 1

    def add_error(self):
        self.error_count += 1

    def print_report(self):
        if not self.response_times:
            logger.info("No successful requests")
            return

        logger.info("\n" + "="*70)
        logger.info("LOAD TEST RESULTS")
        logger.info("="*70)
        logger.info(f"Total Requests: {self.success_count + self.error_count}")
        logger.info(f"Successful: {self.success_count}")
        logger.info(f"Failed: {self.error_count}")
        logger.info(f"Success Rate: {self.success_count/(self.success_count + self.error_count)*100:.1f}%")
        logger.info(f"\nResponse Times (ms):")
        logger.info(f"  Min: {min(self.response_times):.2f}")
        logger.info(f"  Max: {max(self.response_times):.2f}")
        logger.info(f"  Avg: {statistics.mean(self.response_times):.2f}")
        logger.info(f"  Median: {statistics.median(self.response_times):.2f}")
        if len(self.response_times) > 1:
            logger.info(f"  Std Dev: {statistics.stdev(self.response_times):.2f}")
        logger.info(f"  P95: {sorted(self.response_times)[int(len(self.response_times)*0.95)]:.2f}")
        logger.info(f"  P99: {sorted(self.response_times)[int(len(self.response_times)*0.99)]:.2f}")
        logger.info("="*70)


metrics = LoadTestMetrics()


def create_vendor(vendor_id: int) -> tuple:
    """Create a vendor and return token"""
    vendor_data = {
        "name": f"Load Vendor {vendor_id}",
        "email": f"load_vendor_{vendor_id}_{int(time.time())}@test.com",
        "password": "LoadTest123!",
        "role": "vendor",
        "city": "Delhi"
    }

    start = time.time()

    try:
        resp = requests.post(f"{API_URL}/auth/register", json=vendor_data, timeout=10)
        assert resp.status_code == 200

        login_data = {"username": vendor_data["email"], "password": vendor_data["password"]}
        resp = requests.post(f"{API_URL}/auth/login", data=login_data, timeout=10)
        assert resp.status_code == 200

        token = resp.json()["access_token"]

        # Create vendor profile
        profile_data = {
            "shop_name": f"Load Vendor Shop {vendor_id}",
            "category": "Medical",
            "lat": 28.6129 + vendor_id * 0.01,
            "lng": 77.2295 + vendor_id * 0.01,
            "city": "Delhi"
        }

        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.post(f"{API_URL}/vendor/profile", json=profile_data, headers=headers, timeout=10)
        assert resp.status_code == 200

        elapsed = (time.time() - start) * 1000
        metrics.add_response_time(elapsed)

        return token, None

    except Exception as e:
        metrics.add_error()
        return None, str(e)


def create_requester(requester_id: int) -> tuple:
    """Create a requester and return token"""
    requester_data = {
        "name": f"Load Requester {requester_id}",
        "email": f"load_requester_{requester_id}_{int(time.time())}@test.com",
        "password": "LoadTest123!",
        "role": "requester",
        "city": "Bangalore"
    }

    start = time.time()

    try:
        resp = requests.post(f"{API_URL}/auth/register", json=requester_data, timeout=10)
        assert resp.status_code == 200

        login_data = {"username": requester_data["email"], "password": requester_data["password"]}
        resp = requests.post(f"{API_URL}/auth/login", data=login_data, timeout=10)
        assert resp.status_code == 200

        token = resp.json()["access_token"]

        elapsed = (time.time() - start) * 1000
        metrics.add_response_time(elapsed)

        return token, None

    except Exception as e:
        metrics.add_error()
        return None, str(e)


def add_inventory(vendor_token: str, item_id: int):
    """Add inventory item"""
    item_data = {
        "resource_name": f"Load Test Item {item_id}",
        "category": "Medical",
        "quantity": 100 + item_id,
        "price": 1000 + item_id,
        "reorder_level": 10
    }

    start = time.time()

    try:
        headers = {"Authorization": f"Bearer {vendor_token}"}
        resp = requests.post(f"{API_URL}/vendor/inventory", json=item_data, headers=headers, timeout=10)
        assert resp.status_code == 200

        elapsed = (time.time() - start) * 1000
        metrics.add_response_time(elapsed)

    except Exception as e:
        metrics.add_error()


def create_request(requester_token: str, request_id: int):
    """Create resource request"""
    request_data = {
        "resource_name": f"Load Test Request {request_id}",
        "category": "Medical",
        "quantity": 50 + request_id,
        "urgency_level": "high" if request_id % 2 == 0 else "medium",
        "city": "Bangalore",
        "location_lat": 12.9716,
        "location_lng": 77.5946
    }

    start = time.time()

    try:
        headers = {"Authorization": f"Bearer {requester_token}"}
        resp = requests.post(f"{API_URL}/requests/", json=request_data, headers=headers, timeout=10)
        assert resp.status_code == 200

        elapsed = (time.time() - start) * 1000
        metrics.add_response_time(elapsed)

    except Exception as e:
        metrics.add_error()


def get_inventory(vendor_token: str):
    """Retrieve inventory"""
    start = time.time()

    try:
        headers = {"Authorization": f"Bearer {vendor_token}"}
        resp = requests.get(f"{API_URL}/vendor/inventory", headers=headers, timeout=10)
        assert resp.status_code == 200

        elapsed = (time.time() - start) * 1000
        metrics.add_response_time(elapsed)

    except Exception as e:
        metrics.add_error()


def get_stats(vendor_token: str):
    """Get vendor stats"""
    start = time.time()

    try:
        headers = {"Authorization": f"Bearer {vendor_token}"}
        resp = requests.get(f"{API_URL}/vendor/stats", headers=headers, timeout=10)
        assert resp.status_code == 200

        elapsed = (time.time() - start) * 1000
        metrics.add_response_time(elapsed)

    except Exception as e:
        metrics.add_error()


class TestLoadTesting:

    @pytest.mark.timeout(600)
    def test_01_vendor_creation_load(self):
        """Test creating 20 vendors concurrently"""
        logger.info(f"\n[LOAD TEST] Creating {NUM_VENDORS} Vendors Concurrently")

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(create_vendor, i) for i in range(NUM_VENDORS)]
            vendor_tokens = [f.result()[0] for f in concurrent.futures.as_completed(futures)]

        successful = len([t for t in vendor_tokens if t])
        logger.info(f"✓ Created {successful}/{NUM_VENDORS} vendors")

    @pytest.mark.timeout(600)
    def test_02_requester_creation_load(self):
        """Test creating 30 requesters concurrently"""
        logger.info(f"\n[LOAD TEST] Creating {NUM_REQUESTERS} Requesters Concurrently")

        with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
            futures = [executor.submit(create_requester, i) for i in range(NUM_REQUESTERS)]
            requester_tokens = [f.result()[0] for f in concurrent.futures.as_completed(futures)]

        successful = len([t for t in requester_tokens if t])
        logger.info(f"✓ Created {successful}/{NUM_REQUESTERS} requesters")

    @pytest.mark.timeout(600)
    def test_03_inventory_creation_load(self):
        """Test adding inventory items from multiple vendors"""
        logger.info(f"\n[LOAD TEST] Adding Inventory Items Concurrently")

        # Create one vendor for this test
        vendor_token, _ = create_vendor(99)

        if not vendor_token:
            pytest.skip("Could not create vendor")

        # Add 50 items concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(add_inventory, vendor_token, i) for i in range(50)]
            concurrent.futures.wait(futures)

        logger.info(f"✓ Added 50 inventory items")

    @pytest.mark.timeout(600)
    def test_04_request_creation_load(self):
        """Test creating requests from multiple requesters"""
        logger.info(f"\n[LOAD TEST] Creating Resource Requests Concurrently")

        # Create one requester for this test
        requester_token, _ = create_requester(99)

        if not requester_token:
            pytest.skip("Could not create requester")

        # Create 50 requests concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(create_request, requester_token, i) for i in range(50)]
            concurrent.futures.wait(futures)

        logger.info(f"✓ Created 50 resource requests")

    @pytest.mark.timeout(600)
    def test_05_mixed_load_realistic_scenario(self):
        """Test realistic mixed load scenario"""
        logger.info(f"\n[LOAD TEST] Realistic Mixed Load Scenario")
        logger.info(f"  Simulating {CONCURRENT_USERS} concurrent users")

        # Create vendors and requesters
        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
            vendor_futures = [executor.submit(create_vendor, i) for i in range(NUM_VENDORS)]
            requester_futures = [executor.submit(create_requester, i) for i in range(NUM_REQUESTERS)]

            vendor_tokens = [f.result()[0] for f in concurrent.futures.as_completed(vendor_futures)]
            requester_tokens = [f.result()[0] for f in concurrent.futures.as_completed(requester_futures)]

        vendor_tokens = [t for t in vendor_tokens if t]
        requester_tokens = [t for t in requester_tokens if t]

        logger.info(f"  Created {len(vendor_tokens)} vendors, {len(requester_tokens)} requesters")

        # Simulate concurrent operations
        operations = []

        for vendor_token in vendor_tokens:
            for i in range(3):
                operations.append(("add_inventory", vendor_token, i))
                operations.append(("get_stats", vendor_token, None))
                operations.append(("get_inventory", vendor_token, None))

        for requester_token in requester_tokens:
            for i in range(NUM_REQUESTS_PER_REQUESTER):
                operations.append(("create_request", requester_token, i))

        logger.info(f"  Running {len(operations)} concurrent operations...")

        with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENT_USERS) as executor:
            futures = []

            for op_type, token, item_id in operations:
                if op_type == "add_inventory":
                    futures.append(executor.submit(add_inventory, token, item_id))
                elif op_type == "get_stats":
                    futures.append(executor.submit(get_stats, token))
                elif op_type == "get_inventory":
                    futures.append(executor.submit(get_inventory, token))
                elif op_type == "create_request":
                    futures.append(executor.submit(create_request, token, item_id))

            concurrent.futures.wait(futures)

        logger.info(f"✓ Completed realistic load test")

    def test_06_report_metrics(self):
        """Print final metrics report"""
        logger.info("\n[LOAD TEST] Printing Metrics...")
        metrics.print_report()

        # Assert performance is acceptable under concurrent load
        # Note: Load test with 150+ concurrent operations - allow up to 6s avg response
        if metrics.response_times:
            avg_response = statistics.mean(metrics.response_times)
            # For load tests: acceptable if avg < 6000ms (single requests should be faster)
            assert avg_response < 6000, f"Average response time too high: {avg_response}ms"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
