# TODO - Test all admin endpoints across entire codebase

- [x] Inspect backend routing to discover admin endpoints
- [ ] Build/extend a Python script to execute requests for every `/admin/*` endpoint found in codebase
- [ ] Ensure script authenticates as seeded admin user and runs positive + negative auth tests (non-admin)
- [ ] Add campaign_id-dependent tests safely (skip if no campaigns exist)
- [x] Execute tests against running backend and report status summary
- [ ] (If needed) Patch test suite for missing/incorrect endpoints (e.g., vendors/admin/vendors mismatch)


