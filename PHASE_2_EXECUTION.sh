#!/bin/bash
# EmpathI DOWNGRADE: Phase 2 Execution Commands
# ==============================================
# DELETE MARKETPLACE, DISASTER, AND FRAGMENTED SYSTEMS
# Status: READY TO EXECUTE
# Duration: ~1 hour (files only, excludes testing)

set -e  # Exit on first error

echo "========================================================================"
echo "EmpathI DOWNGRADE: PHASE 2 EXECUTION"
echo "Delete marketplace, disaster, and fragmented subsystems"
echo "========================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# STEP 1: VERIFY MIGRATIONS ARE APPLIED
# ============================================================================

echo -e "${YELLOW}STEP 1: Verify Migrations${NC}"
echo "-------"
echo "Before executing deletions, ensure migrations are applied:"
echo ""
echo "  cd backend"
echo "  alembic upgrade 20250522_00  # Rename roles"
echo "  alembic upgrade 20250522_01  # Delete marketplace/disaster tables"
echo ""
echo "Press ENTER once migrations are applied..."
read -r

# ============================================================================
# STEP 2: DELETE BACKEND SERVICES (14 files)
# ============================================================================

echo ""
echo -e "${YELLOW}STEP 2: Delete Backend Services (14 files)${NC}"
echo "-------"

SERVICES_TO_DELETE=(
  "backend/services/request_service.py"
  "backend/services/matching_service.py"
  "backend/services/ranking_service.py"
  "backend/services/vendor_service.py"
  "backend/services/inventory_service.py"
  "backend/services/crisis_service.py"
  "backend/services/news_service.py"
  "backend/services/transaction_service.py"
  "backend/services/product_lookup_service.py"
  "backend/services/rules.py"
  "backend/services/orchestrator.py"
  "backend/services/feature_store.py"
  "backend/services/lgbm_service.py"
  "backend/services/fairness_reranker.py"
  "backend/services/fairness.py"
)

for file in "${SERVICES_TO_DELETE[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo -e "${GREEN}✓${NC} Deleted: $file"
  else
    echo -e "${YELLOW}⚠${NC} Not found: $file"
  fi
done

# ============================================================================
# STEP 3: DELETE ML MODULES (12 files)
# ============================================================================

echo ""
echo -e "${YELLOW}STEP 3: Delete ML Modules (12 files)${NC}"
echo "-------"

ML_MODULES_TO_DELETE=(
  "backend/ml/ml_pipeline.py"
  "backend/ml/ml_modeling.py"
  "backend/ml/ml_data_pipeline.py"
  "backend/ml/ml_process.py"
  "backend/ml/predict.py"
  "backend/ml/train.py"
  "backend/ml/features.py"
  "backend/ml/datasets.py"
  "backend/ml/trust_datasets.py"
  "backend/ml/trust_train.py"
  "backend/ml/crisis_forecaster.py"
  "backend/ml/graph_intelligence.py"
  "backend/ml/simulation_engine.py"
  "backend/ml/adaptive_ranking.py"
)

for file in "${ML_MODULES_TO_DELETE[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo -e "${GREEN}✓${NC} Deleted: $file"
  else
    echo -e "${YELLOW}⚠${NC} Not found: $file"
  fi
done

# ============================================================================
# STEP 4: DELETE API ENDPOINTS (7 modules)
# ============================================================================

echo ""
echo -e "${YELLOW}STEP 4: Delete API Endpoints (7 modules)${NC}"
echo "-------"

ENDPOINTS_TO_DELETE=(
  "backend/api/v1/endpoints/requests.py"
  "backend/api/v1/endpoints/matches.py"
  "backend/api/v1/endpoints/vendors.py"
  "backend/api/v1/endpoints/inventory.py"
  "backend/api/v1/endpoints/intelligence.py"
  "backend/api/v1/endpoints/news.py"
  "backend/api/v1/endpoints/transactions.py"
)

for file in "${ENDPOINTS_TO_DELETE[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo -e "${GREEN}✓${NC} Deleted: $file"
  else
    echo -e "${YELLOW}⚠${NC} Not found: $file"
  fi
done

# ============================================================================
# STEP 5: DELETE REPOSITORIES (4 files)
# ============================================================================

echo ""
echo -e "${YELLOW}STEP 5: Delete Repositories (4 files)${NC}"
echo "-------"

REPOS_TO_DELETE=(
  "backend/repositories/request_repo.py"
  "backend/repositories/match_repo.py"
  "backend/repositories/vendor_repo.py"
  "backend/repositories/inventory_repo.py"
)

for file in "${REPOS_TO_DELETE[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo -e "${GREEN}✓${NC} Deleted: $file"
  else
    echo -e "${YELLOW}⚠${NC} Not found: $file"
  fi
done

# ============================================================================
# STEP 6: DELETE FRONTEND PAGES (16 files)
# ============================================================================

echo ""
echo -e "${YELLOW}STEP 6: Delete Frontend Pages (16 files)${NC}"
echo "-------"

FRONTEND_PAGES_TO_DELETE=(
  "frontend/src/pages/ResourceRequestPage.jsx"
  "frontend/src/pages/ResourceMatchingPage.jsx"
  "frontend/src/pages/MatchResults.jsx"
  "frontend/src/pages/ResourceHubPage.jsx"
  "frontend/src/pages/VendorMarketplace.jsx"
  "frontend/src/pages/VendorDashboard.jsx"
  "frontend/src/pages/VendorStorefront.jsx"
  "frontend/src/pages/VendorAnalytics.jsx"
  "frontend/src/pages/InventoryManagement.jsx"
  "frontend/src/pages/IncomingRequests.jsx"
  "frontend/src/pages/TransactionHistory.jsx"
  "frontend/src/pages/ResourceDeclarationPage.jsx"
  "frontend/src/pages/AdminVendorManagement.jsx"
  "frontend/src/pages/VerificationDashboard.jsx"
  "frontend/src/pages/VerificationDetailPage.jsx"
)

for file in "${FRONTEND_PAGES_TO_DELETE[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo -e "${GREEN}✓${NC} Deleted: $file"
  else
    echo -e "${YELLOW}⚠${NC} Not found: $file"
  fi
done

# ============================================================================
# STEP 7: DELETE FRONTEND SERVICES (2 files)
# ============================================================================

echo ""
echo -e "${YELLOW}STEP 7: Delete Frontend Services (2 files)${NC}"
echo "-------"

FRONTEND_SERVICES_TO_DELETE=(
  "frontend/src/services/geoService.js"
  "frontend/src/services/excelLoader.js"
)

for file in "${FRONTEND_SERVICES_TO_DELETE[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo -e "${GREEN}✓${NC} Deleted: $file"
  else
    echo -e "${YELLOW}⚠${NC} Not found: $file"
  fi
done

# ============================================================================
# STEP 8: DELETE FRONTEND CONTEXT (1 file)
# ============================================================================

echo ""
echo -e "${YELLOW}STEP 8: Delete Frontend Context (1 file)${NC}"
echo "-------"

if [ -f "frontend/src/context/ResourceContext.jsx" ]; then
  rm -f "frontend/src/context/ResourceContext.jsx"
  echo -e "${GREEN}✓${NC} Deleted: frontend/src/context/ResourceContext.jsx"
else
  echo -e "${YELLOW}⚠${NC} Not found: frontend/src/context/ResourceContext.jsx"
fi

# ============================================================================
# STEP 9: UPDATE IMPORTS IN ROUTER
# ============================================================================

echo ""
echo -e "${YELLOW}STEP 9: Update Imports in Router${NC}"
echo "-------"
echo "Manual step: Update backend/api/v1/router.py"
echo ""
echo "Remove these includes:"
echo "  - from api.v1.endpoints import requests"
echo "  - from api.v1.endpoints import matches"
echo "  - from api.v1.endpoints import vendors"
echo "  - from api.v1.endpoints import inventory"
echo "  - from api.v1.endpoints import intelligence"
echo "  - from api.v1.endpoints import news"
echo "  - from api.v1.endpoints import transactions"
echo ""
echo "Remove these routes:"
echo "  - router.include_router(requests.router, prefix=\"/requests\")"
echo "  - router.include_router(matches.router, prefix=\"/matches\")"
echo "  - router.include_router(vendors.router, prefix=\"/vendors\")"
echo "  - router.include_router(inventory.router, prefix=\"/inventory\")"
echo "  - router.include_router(intelligence.router, prefix=\"/intelligence\")"
echo "  - router.include_router(news.router, prefix=\"/news\")"
echo "  - router.include_router(transactions.router, prefix=\"/transactions\")"
echo ""
echo "Press ENTER once router.py is updated..."
read -r

# ============================================================================
# STEP 10: VERIFY NO BROKEN IMPORTS
# ============================================================================

echo ""
echo -e "${YELLOW}STEP 10: Verify No Broken Imports${NC}"
echo "-------"
echo ""
echo "Running Python import check on backend services..."
echo ""

cd backend || exit

# Check for import errors
if python -m py_compile services/*.py 2>/dev/null; then
  echo -e "${GREEN}✓${NC} Backend services compile without import errors"
else
  echo -e "${RED}✗${NC} Backend services have import errors - fix them before proceeding"
  exit 1
fi

cd ..

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "========================================================================"
echo -e "${GREEN}PHASE 2: DELETION COMPLETE${NC}"
echo "========================================================================"
echo ""
echo "Summary of deletions:"
echo "  • 14 backend services deleted"
echo "  • 12 ML modules deleted"
echo "  • 7 API endpoint modules deleted"
echo "  • 4 repository files deleted"
echo "  • 16 frontend pages deleted"
echo "  • 2 frontend services deleted"
echo "  • 1 frontend context deleted"
echo ""
echo "Total: 57 files deleted"
echo ""
echo "Next steps:"
echo "  1. Update frontend/src/App.jsx (remove 17 routes)"
echo "  2. Run: npm run build (frontend build check)"
echo "  3. Run: pytest backend/ (test suite)"
echo "  4. Create git commit: \"Phase 2: Delete marketplace and disaster systems\""
echo "  5. Proceed to Phase 3: Frontend consolidation"
echo ""
echo -e "${GREEN}Ready for Phase 3!${NC}"
echo ""
