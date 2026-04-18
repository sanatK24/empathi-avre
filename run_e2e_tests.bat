@echo off
setlocal enabledelayedexpansion

REM AVRE Platform - E2E Test Runner for Windows
REM This script sets up and runs the complete test suite

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║          AVRE Platform - End-to-End Testing Suite              ║
echo ║      Testing: Concurrent Vendor ^& Requester Workflows          ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check if backend is running
echo 🔍 Checking backend status...
timeout /t 1 /nobreak >nul
if not exist "%temp%\backend_check" (
    powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:8000/health' -ErrorAction Stop; exit 0 } catch { exit 1 }" 2>nul
    if !ERRORLEVEL! neq 0 (
        echo ❌ Backend is not running on http://localhost:8000
        echo    Start it with: cd backend ^&^& python main.py
        pause
        exit /b 1
    )
)
echo ✅ Backend is running

REM Check if frontend is running
echo 🔍 Checking frontend status...
timeout /t 1 /nobreak >nul
powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:5173' -ErrorAction Stop; exit 0 } catch { exit 1 }" 2>nul
if !ERRORLEVEL! neq 0 (
    echo ❌ Frontend is not running on http://localhost:5173
    echo    Start it with: cd empathi-frontend ^&^& npm run dev
    pause
    exit /b 1
)
echo ✅ Frontend is running

REM Create screenshots directory
if not exist "screenshots" mkdir screenshots
echo ✅ Screenshots directory ready

echo.
echo 📋 Available test options:
echo.
echo   1) Run all tests (full suite)
echo   2) Run vendor tests only
echo   3) Run requester tests only
echo   4) Run concurrent tests only
echo   5) Run integration tests only
echo   6) Quick test (registration + login only)
echo.

set /p option="Select option (1-6): "

if "%option%"=="1" (
    echo.
    echo 🚀 Running full test suite...
    pytest tests/test_e2e_vendor_requester.py -v -s
) else if "%option%"=="2" (
    echo.
    echo 🔷 Running vendor tests...
    pytest tests/test_e2e_vendor_requester.py::TestVendorFlow -v -s
) else if "%option%"=="3" (
    echo.
    echo 🟢 Running requester tests...
    pytest tests/test_e2e_vendor_requester.py::TestRequesterFlow -v -s
) else if "%option%"=="4" (
    echo.
    echo ⚡ Running concurrent tests...
    pytest tests/test_e2e_vendor_requester.py::TestConcurrentFlow -v -s
) else if "%option%"=="5" (
    echo.
    echo 🎯 Running integration tests...
    pytest tests/test_e2e_vendor_requester.py::TestFullIntegration -v -s
) else if "%option%"=="6" (
    echo.
    echo ⚡ Running quick tests (registration + login)...
    pytest tests/test_e2e_vendor_requester.py::TestVendorFlow::test_01_vendor_register ^
           tests/test_e2e_vendor_requester.py::TestVendorFlow::test_02_vendor_login ^
           tests/test_e2e_vendor_requester.py::TestRequesterFlow::test_01_requester_register ^
           tests/test_e2e_vendor_requester.py::TestRequesterFlow::test_02_requester_login ^
           -v -s
) else (
    echo ❌ Invalid option
    pause
    exit /b 1
)

echo.
echo ✅ Test run complete!
echo.
echo 📸 Check screenshots in: ./screenshots/
echo.
pause
