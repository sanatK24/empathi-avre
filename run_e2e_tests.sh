#!/bin/bash

# AVRE Platform - E2E Test Runner
# This script sets up and runs the complete test suite

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          AVRE Platform - End-to-End Testing Suite              ║"
echo "║      Testing: Concurrent Vendor & Requester Workflows          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if backend is running
echo "🔍 Checking backend status..."
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "❌ Backend is not running on http://localhost:8000"
    echo "   Start it with: cd backend && python main.py"
    exit 1
fi
echo "✅ Backend is running"

# Check if frontend is running
echo "🔍 Checking frontend status..."
if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "❌ Frontend is not running on http://localhost:5173"
    echo "   Start it with: cd empathi-frontend && npm run dev"
    exit 1
fi
echo "✅ Frontend is running"

# Create screenshots directory
mkdir -p screenshots
echo "✅ Screenshots directory ready"

echo ""
echo "📋 Available test options:"
echo ""
echo "  1) Run all tests (full suite)"
echo "  2) Run vendor tests only"
echo "  3) Run requester tests only"
echo "  4) Run concurrent tests only"
echo "  5) Run integration tests only"
echo "  6) Quick test (registration + login only)"
echo ""

read -p "Select option (1-6): " option

case $option in
    1)
        echo ""
        echo "🚀 Running full test suite..."
        pytest tests/test_e2e_vendor_requester.py -v -s
        ;;
    2)
        echo ""
        echo "🔷 Running vendor tests..."
        pytest tests/test_e2e_vendor_requester.py::TestVendorFlow -v -s
        ;;
    3)
        echo ""
        echo "🟢 Running requester tests..."
        pytest tests/test_e2e_vendor_requester.py::TestRequesterFlow -v -s
        ;;
    4)
        echo ""
        echo "⚡ Running concurrent tests..."
        pytest tests/test_e2e_vendor_requester.py::TestConcurrentFlow -v -s
        ;;
    5)
        echo ""
        echo "🎯 Running integration tests..."
        pytest tests/test_e2e_vendor_requester.py::TestFullIntegration -v -s
        ;;
    6)
        echo ""
        echo "⚡ Running quick tests (registration + login)..."
        pytest tests/test_e2e_vendor_requester.py::TestVendorFlow::test_01_vendor_register \
               tests/test_e2e_vendor_requester.py::TestVendorFlow::test_02_vendor_login \
               tests/test_e2e_vendor_requester.py::TestRequesterFlow::test_01_requester_register \
               tests/test_e2e_vendor_requester.py::TestRequesterFlow::test_02_requester_login \
               -v -s
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac

echo ""
echo "✅ Test run complete!"
echo ""
echo "📸 Check screenshots in: ./screenshots/"
echo ""
