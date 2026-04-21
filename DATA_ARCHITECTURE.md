# EmpathI Data Architecture & Intelligence Modeling

This document provides a comprehensive overview of the dataset schemas, API contracts, and intelligence modeling strategies used in the EmpathI project.

---

## 1. Database Schemas (SQLAlchemy Models)
The project uses a structured relational database with the following core entities defined in `backend/models.py`.

| Entity | Purpose | Key Fields |
| :--- | :--- | :--- |
| **User** | Central identity & auth | `email`, `role`, `social_provider`, `social_id`, `avatar_url`, `organization_name`, `is_active` |
| **Vendor** | Provider of resources | `shop_name`, `category`, `lat/lng` (geo), `rating`, `reliability_score`, `verification_status` |
| **Inventory** | Items held by vendors | `resource_name`, `category`, `quantity`, `reserved_quantity`, `price`, `expiry_date` |
| **Request** | Consumer resource needs | `resource_name`, `quantity`, `urgency_level` (Low-Critical), `location`, `status` |
| **Match** | The bridge between need and supply | `score`, `ml_score`, `rule_score`, `explanation_json`, `status` |
| **Campaign** | Crowdfunding/Resource drives | `title`, `goal_amount`, `raised_amount`, `deadline`, `verified` |
| **Donation** | Contributions to campaigns | `amount`, `anonymous`, `message`, `status` |
| **AuditLog** | System traceability & security | `action`, `resource_type`, `severity`, `ip_address`, `details` |

---

## 2. API Data Contracts (Pydantic Schemas)
These schemas handle the validation and serialization of data between the FastAPI backend and the React frontend (`backend/schemas.py`).

### Authentication & Profiles
- `SocialAuthRequest`: Handles Google OAuth tokens and registration roles.
- `UserResponse`: Comprehensive user profile including new `avatar_url` and role data.
- `Token`: JWT bearer token structure.

### Resource Intelligence
- `RequestCreate`: Validates location coordinates, urgency levels, and resource naming.
- `RankedVendor`: Contains calculated distances, relevance scores, and human-readable explanations ("The Story behind the match").
- `MatchResponse`: A collection of ranked vendors for a specific individual request.

---

## 3. Intelligence & Machine Learning Modeling
The core of **EmpathI** is the **EmpathI Coordination & Matching Engine**, a hybrid fulfillment intelligence system.

### A. The Scoring Engine
The engine uses a combination of **Binary Rules** and **ML Weighting**:
- **Hard Constraints**: Geographical distance (service radius), exact category matching, and stock sufficiency.
- **ML Predictions**: Predicts the likelihood of successful fulfillment based on historical vendor behavior and real-time environment variables.

### B. Selection of Algorithms
The system benchmarks several state-of-the-art models before selecting the best performer:
1. **Random Forest Regressor**: Handles high-dimensionality and non-linear data relationships.
2. **Gradient Boosting (GBM)**: Optimized for minimizing prediction error over time.
3. **XGBoost**: High-performance gradient boosting for large-scale vendor datasets.
4. **LightGBM Ranker**: Uses `lambdarank` to optimize for **NDCG**, ensuring the highest quality matches appear at the top of the search results.

### C. Feature Engineering Strategy
- **Geo-Features**: Haversine distance calculations and city-based clustering.
- **Reliability Features**: Historical success rates, average response times, and rating stability.
- **Supply Features**: Stock-to-request ratios and inventory freshness (expiry tracking).
- **Temporal Features**: Urgency-weighted decay functions for time-sensitive requests.

### D. Evaluation & Metrics
- **Regression**: MAE, RMSE, and R2 to measure score accuracy.
- **Ranking**: NDCG@3, MAP@3, and Precision@1 to measure the quality of the ordered list presented to users.

---

## 4. Real-time Adaptability
- **Emergency Dynamic Weighting**: Admins can declare a "System-wide Emergency" which shifts the intelligence engine to prioritize speed and stock over cost and distance.
- **Anti-Monopoly Fairness**: Implements a "Fairness Penalty" for vendors receiving an influx of requests, ensuring resource distribution across the local supply chain.

---

## 5. API Endpoints Reference
The backend follows a modular routing structure. All endpoints are relative to the base server URL (e.g., `http://localhost:8000`).

### Authentication (`/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/auth/register` | Create a new user account |
| POST | `/auth/login` | Login with email/password (OAuth2 Password Flow) |
| POST | `/auth/social` | Login/Register with Google OAuth |
| GET | `/auth/me` | Fetch currently authenticated user profile |
| PUT | `/auth/profile` | Update user profile details |
| DELETE | `/auth/profile` | Deactivate/Delete user account |

### Requests & Matching (`/requests` & `/match`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/requests/` | Create a new resource request |
| GET | `/requests/my` | View request history for current user |
| GET | `/requests/stats` | Dashboard statistics for requesters |
| GET | `/requests/{id}/matches` | Trigger EmpathI engine and fetch ranked vendors |
| POST | `/requests/{id}/accept/{v_id}` | Accept a specific vendor match |
| POST | `/requests/{id}/cancel` | Cancel an active request |
| GET | `/match/{req_id}` | View detailed calculation for a match |
| POST | `/match/{req_id}/complete` | Mark a request as fulfilled |

### Vendor Services (`/vendor`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/vendor/profile` | Fetch vendor-specific profile data |
| GET | `/vendor/inventory` | List all inventory items |
| POST | `/vendor/inventory` | Add new item to stock |
| PUT | `/vendor/inventory` | Update stock quantity/price |
| GET | `/vendor/analytics` | Fetch performance & matching analytics |

### Campaigns & Philanthropy (`/campaigns`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/campaigns/` | List all active/trending campaigns |
| POST | `/campaigns/` | Create a new fundraising campaign |
| GET | `/campaigns/search` | Full-text search for campaigns |
| GET | `/campaigns/analytics/dashboard` | Global campaign analytics |
| GET | `/campaigns/analytics/{id}/perf` | Detailed performance for one campaign |
| GET | `/campaigns/analytics/recommendations/personalized` | ML-driven campaign suggestions |

### Admin Control (`/admin`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/admin/stats` | System-wide health and activity metrics |
| GET | `/admin/users` | Manage all registered users |
| POST | `/admin/verify-vendor/{id}` | Formally verify a vendor account |
| PUT | `/admin/scoring-weights` | Hot-swap EmpathI scoring logic |

### Payments & Donations (`/payments` & `/donations`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | `/payments/process` | Simulate a donation payment |
| GET | `/payments/history` | User transaction history |
| GET | `/donations/campaign/{id}/stats` | Real-time funding progress |

---

## 6. Depth Technical Audit & Brutal Code Review

### 6.1 Executive Summary
*   **Current Maturity**: **Prototype (3/10)**. The platform is currently a "collection of features" rather than a unified ecosystem. While Part A (Vendors) has technical bones, Part B (Emergency) relies on placeholders.
*   **Architectural Debt**: Significant logic duplication between `request_routes` and `requester_routes`.
*   **FYP Potential**: 8.5/10. Provided the "Fake" heuristics in Part B are replaced with the proposed `UnifiedFulfillmentEngine`.

### 6.2 Backend Audit: Separation of Concerns
Currently, route handlers in `backend/routes/` are performing database queries, business logic, and even third-party simulations (like payments) directly.

**Issue: Logic Leaking**
In `backend/routes/requester_routes.py`, the `get_matches` function handles everything from state validation to triggering the EmpathI engine and saving results. This makes unit testing almost impossible.

**Sample Improved Structure (Service Pattern):**
```python
# backend/services/matching_service.py
class MatchingService:
    @staticmethod
    def get_or_create_matches(db: Session, request_id: int):
        request = db.query(Request).get(request_id)
        if not request: raise ResourceNotFound()
        
        # Logic isolated from HTTP concerns
        matches = db.query(Match).filter(Match.request_id == request_id).all()
        if not matches:
             matches = EmpathIEngine().compute(db, request)
        return matches
```

### 6.3 ML Audit: Realism vs. Heuristics
**The "Scoring" Problem:**
In `backend/routes/analytics_routes.py`, campaign recommendations are calculated using a hardcoded point system. This is a "Pseudo-ML" anti-pattern that fails in production due to lack of weight optimization and bias drift.

**Unification Strategy:**
Instead of two separate engines, create a **Contextual Embedding Layer**:
1.  **Encoder**: Convert `RequestDesc` or `CampaignTitle` into a 384-dimensional vector using `all-MiniLM-L6-v2`.
2.  **Vector Store**: Store these in a flat-file vector index (FAISS) or a specialized DB column.
3.  **Similarity Search**: Use Cosine Similarity to find candidates, then pass them to the **XGBoost Ranker** for final scoring.

**MVP vs. Upgraded Model:**
- **MVP**: Existing Regressor + Semantic string similarity (`fuzz.ratio`).
- **Upgraded**: **LightGBM Ranker** trained on historical "Acceptance" events (Binary Classification: Did the user click 'Accept Vendor'?).

### 6.4 Security Audit: Authorization & Exploits
*   **Auth Vulnerability**: `get_current_user` is used broadly, but specific resource ownership is checked ad-hoc (`User.id == Request.user_id`). This leads to "ID Harpooning" if one check is missed.
*   **Fix**: Implement Scoped Access dependencies (e.g., `Depends(get_owned_request)`).
*   **Mass Assignment Risk**: `Request(**req_in.dict())` allows users to potentially inject controlled fields like `status` if the Pydantic schema isn't strictly narrowed.

### 6.5 Part B: Emergency coordination Depth
**The Trust Deficiency**: Currently, any user can create a "Critical" campaign.
**Proposed Architecture**:
1.  **Validation Nodes**: Assign `verifier` roles to specific users. Verifiers receive a feed of "Pending Campaigns" and must upload a `VerificationProof`.
2.  **Resource Routing**: A campaign should link to a `RequiredResources` table. The system should automatically query **Part A (Vendors)** to find local suppliers who can fulfill those specific resources at a discount.

---

## 7. Final Verdict & Quality Ratings

| Category | Score | Brutal Assessment |
| :--- | :---: | :--- |
| **Backend Architecture** | 4/10 | Functional but "Procedural". Needs Service/Repository separation. |
| **Frontend Execution** | 9/10 | Exceptional UI/UX. Professional animations and responsive design. |
| **ML Authenticity** | 3/10 | Part A has bones; Part B is entirely hardcoded heuristics. |
| **Security Foundation** | 5/10 | Standard JWT is good; specific RBAC and injection prevention is weak. |
| **Scalability** | 4/10 | N+1 query patterns will crash under 100+ concurrent users. |
| **Product Credibility** | 6/10 | Concept is powerful, but the "Coordination" bridge is manually driven. |

**OVERALL SCORE: 5.2 / 10** (Target: 9.0)

### Code Patch: Service Abstraction
```python
# Refactored Route Handler (Sample)
@router.post("/", response_model=Response)
def create_request(data: RequestCreate, service: RequestService = Depends(get_request_service)):
    return service.create_and_broadcast(data)
```

---

## 8. Why This Audit is Not Enough (The Execution Gap)

While this audit identifies the "What" and "Why," it still lacks the **Execution Blueprint** required to reach a gold-standard production state. To fully mature the platform, the following sub-plans must be developed:

1.  **Exact Migration Path**: A step-by-step branching strategy to move from the current `routes-only` logic to a clean `Controller-Service-Repository` structure.
2.  **Concrete Database Evolution**: Migration scripts for transitioning from simple foreign keys to a global `Interaction` and `Activity` log system for ML training.
3.  **ML Data Pipeline Order**: Implementation order for Feature Store creation → Offline Training → Shadow Deployment → Online Inference.
4.  **Frontend Redesign Priorities**: A feature-by-feature hierarchy (e.g., prioritizing the 'Unified Dashboard' and 'Global Search' over auxiliary settings pages).
5.  **Deployment Architecture**: Transition plan from local SQLite/Uvicorn to a containerized Docker-Compose stack with Nginx, PostgreSQL, and Redis.
6.  **Monitoring & Observability**: Integration of structured logging (`structlog`) and performance tracing (`Sentry/OpenTelemetry`) for the ML engine.
7.  **Real Dataset Generation**: A plan to replace the mock seed data with a realistic, synthetic dataset generated via LLMs to match real-world entity complexity.
8.  **Testing Strategy**: A shift from zero coverage to a mandatory `Pytest` suite covering Service-layer logic and API contract validation.
9.  **File-by-File Refactor Map**: A list of every file in the project and the specific architectural changes required for each.
10. **Performance Optimization**: A strategy for indexing, query optimization, and frontend bundle minimization (Vite tuning).

**Conclusion**: This is a high-level strategic audit. The next step is a **Tactical Execution Roadmap**.




