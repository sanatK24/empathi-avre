#!/usr/bin/env python
"""
E2E Test Runner - Starts backend and runs tests
Run with: python run_tests.py [--no-server] [--coverage] [other pytest args]
"""

import subprocess
import sys
import os
import time
import signal
import requests
from pathlib import Path

# Change to backend directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def wait_for_server(url="http://localhost:8000", timeout=30):
    """Wait for backend server to be ready"""
    start = time.time()
    while time.time() - start < timeout:
        try:
            response = requests.get(url + "/health", timeout=2)
            if response.status_code == 200:
                print("[OK] Backend server is ready")
                return True
        except:
            pass
        time.sleep(0.5)

    print("[ERROR] Backend server did not start within timeout")
    return False

def start_backend():
    """Start backend server"""
    print("[*] Starting backend server on http://localhost:8000...")

    try:
        process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app", "--port", "8000"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0
        )

        # Give server time to start
        time.sleep(2)

        # Check if process is still alive
        if process.poll() is not None:
            stdout, stderr = process.communicate()
            print(f"[ERROR] Backend failed to start: {stderr.decode()}")
            return None

        print("[OK] Backend server started (PID: {})".format(process.pid))
        return process

    except Exception as e:
        print(f"[ERROR] Failed to start backend: {str(e)}")
        return None

def stop_backend(process):
    """Stop backend server"""
    if process is None:
        return

    try:
        print("[*] Stopping backend server...")
        if sys.platform == 'win32':
            os.kill(process.pid, signal.SIGTERM)
        else:
            process.terminate()

        # Wait for process to terminate
        process.wait(timeout=5)
        print("[OK] Backend server stopped")
    except:
        try:
            if sys.platform == 'win32':
                os.kill(process.pid, signal.SIGKILL)
            else:
                process.kill()
        except:
            pass

def run_tests(pytest_args):
    """Run pytest with given arguments"""
    print("[*] Running tests...")
    cmd = [sys.executable, "-m", "pytest", "tests/"] + pytest_args

    return subprocess.call(cmd)

def main():
    # Parse arguments
    pytest_args = []
    no_server = False
    show_help = False

    for arg in sys.argv[1:]:
        if arg == "--no-server":
            no_server = True
        elif arg in ["--help", "-h"]:
            show_help = True
            print_help()
            return 0
        else:
            pytest_args.append(arg)

    # Default to API tests if no args provided
    if not pytest_args:
        pytest_args = ["-m", "api", "-v", "--tb=short"]

    backend_process = None

    try:
        # Start backend server unless --no-server flag
        if not no_server:
            print("\n" + "="*70)
            print("  E2E Test Suite Runner")
            print("="*70 + "\n")

            backend_process = start_backend()
            if backend_process is None:
                print("\n[ERROR] Cannot start backend server. Use --no-server to skip.")
                return 1

            # Wait for server to be ready
            if not wait_for_server():
                print("\n[ERROR] Backend server did not respond to health check")
                return 1

        # Run tests
        print("\n" + "-"*70)
        exit_code = run_tests(pytest_args)
        print("-"*70 + "\n")

        return exit_code

    finally:
        # Always stop backend if we started it
        if backend_process:
            stop_backend(backend_process)

def print_help():
    """Print help for test runner"""
    help_text = """
E2E Test Runner - Runs E2E tests with automatic backend server management

Usage:
    python run_tests.py [OPTIONS] [PYTEST_ARGS]

Options:
    --no-server     Don't start/stop backend server (assume already running)
    --help, -h      Show this help message

Examples:
    # Run default API tests
    python run_tests.py

    # Run all tests including UI tests (requires frontend running)
    python run_tests.py --no-server

    # Run specific test file
    python run_tests.py tests/test_campaigns_api.py

    # Run smoke tests only
    python run_tests.py -m smoke

    # Run with coverage report
    python run_tests.py --cov=backend --cov-report=html

    # Run single test with verbose output
    python run_tests.py tests/test_campaigns_api.py::TestCampaignCRUD::test_create_campaign -vv

Common pytest arguments:
    -v, --verbose           Verbose output
    -m MARKER               Run tests with specific marker (api, smoke, integration, slow)
    -x, --exitfirst         Exit on first failure
    -k EXPRESSION           Run tests matching expression
    --tb=short              Short traceback format
    --cov=PATH              Generate coverage report
    --html=PATH             Generate HTML report
"""
    print(help_text)

if __name__ == "__main__":
    sys.exit(main())
