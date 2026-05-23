# Admin endpoint testing TODO

## Completed
- [x] Discovered backend admin endpoints by inspecting `backend/api/v1/endpoints/admin.py`

## Remaining
- [ ] Run `backend/tests_admin_endpoints.py` or `test_all_endpoints_admin.py` against a live backend instance and capture results
- [ ] Optionally extend to negative tests for invalid payloads / invalid params (currently only auth negative)
- [ ] (Optional) Add a generic discovery-based test that enumerates all `/admin/*` routes automatically from FastAPI/OpenAPI

