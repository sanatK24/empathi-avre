"""
Pytest configuration and shared fixtures for E2E testing
"""

import pytest
import os
from pathlib import Path


def pytest_configure(config):
    """Create screenshots directory before tests run"""
    screenshots_dir = Path(__file__).parent.parent / "screenshots"
    screenshots_dir.mkdir(exist_ok=True)


@pytest.fixture(scope="session", autouse=True)
def print_test_info():
    """Print test session info"""
    print("\n" + "="*70)
    print("AVRE Platform - End-to-End Testing Suite")
    print("Testing: Concurrent Vendor & Requester Workflows")
    print("Data: Realistic Indian Medical Suppliers & Hospital Data")
    print("="*70 + "\n")
    yield
    print("\n" + "="*70)
    print("✅ Test Session Complete")
    print("="*70 + "\n")
