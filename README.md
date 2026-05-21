# EmpathI - Adaptive Vendor Relevance Engine (AVRE)

**EmpathI** is a sophisticated humanitarian logistics and community-driven fundraising platform. It bridges the gap between those in urgent need of resources and local vendors, while simultaneously providing a robust crowdfunding ecosystem for humanitarian campaigns.

Built with a modern **FastAPI + React + PostgreSQL** stack, EmpathI leverages Machine Learning (AVRE) to ensure high-relevance resource matching and uses advanced AI to personalize the donor experience.

---

## 🚀 Key Modules & Detailed Features

### 1. **User Identity & Multi-Role Governance**
- **Unified Auth System**: Secure JWT-based authentication with encrypted password hashing (Bcrypt).
- **Role-Based Access Control (RBAC)**:
  - **Requesters**: Can launch resource requests, start fundraising campaigns, and follow community updates.
  - **Vendors**: Manage professional storefronts, inventory levels, and respond to matched requests.
  - **Admins**: oversee system health, verify sensitive campaigns, and moderate the marketplace.
- **Public Profiles**: Dynamic profile cards showing user activity, follower counts, and contribution history.

### 2. **AVRE: Intelligent Matching Engine**
The **Adaptive Vendor Relevance Engine (AVRE)** is the core intelligence of the platform, designed to solve the "last-mile" logistics of humanitarian aid.
- **Hybrid Scoring**: Combines a **RandomForest ML Model** with deterministic business rules.
- **Ranking Signals**:
  - **Geographic Proximity**: Calculates exact distance between requester and vendor.
  - **Urgency Boost**: Prioritizes life-critical requests (Medical, Disaster).
  - **Fairness Penalty**: Prevents a single large vendor from monopolizing all requests, ensuring community-wide distribution.
  - **Stock Confidence**: Prefers vendors with high inventory accuracy and recent updates.
- **Fulfillment Pipeline**: Matches are retrieved via REST API and updated dynamically through dashboard interactions.

### 3. **Campaign Fundraising Ecosystem**
A comprehensive suite for community-driven aid:
- **Campaign Creation**: Requesters can launch campaigns with rich descriptions, target goals, and urgency levels.
- **Verification Workflow**: Sensitive campaigns undergo an admin review process to ensure legitimacy.
- **Interactive Analytics**: Owners can track donor counts, funding progress, and daily velocity through dedicated charts.
- **Public Preview Mode**: Allows creators to see their campaign exactly as a potential donor would.
- **Masonry Discovery**: A visually stunning, Pinterest-style grid for exploring campaigns across categories (Medical, Education, Disaster, etc.).

### 4. **Vendor Marketplace & Storefronts**
- **Professional Storefronts**: Each vendor has a public-facing store showing their inventory, ratings, and reliability metrics.
- **Inventory Management**: Structured stock tracking with expiry date alerts and automated status updates.
- **Vendor Analytics**: Tracks completion rates, response times, and "Fairness Score" within the ecosystem.
- **Rating & Reputation**: A transparent feedback loop where requesters rate vendors post-fulfillment.

### 5. **Personalized AI Recommendations**
- **Smart Feed**: An AI-driven discovery engine that ranks campaigns based on:
  - **User Interests**: Mapped from past donations and interactions.
  - **Location Awareness**: Surfaces nearby community needs.
  - **Verification Status**: Boosts verified and high-urgency causes.
- **Match Percentage**: Displays a "Relevance Score" on every card, explaining why the campaign was recommended.

### 6. **Humanitarian Emergency Hub**
- **Infrastructure Lookup**: Geolocation-aware search for nearest hospitals, trauma centers, and blood banks.
- **Emergency Directory**: Quick-access contacts for national and city-specific emergency services.

### 7. **Social & Community Engagement**
- **Follow System**: Users can follow vendors or campaign creators to get notified of new updates.
- **Bookmarks**: Save campaigns for later support or tracking.
- **Interaction Cards**: Clickable creator names across the UI lead to full public profiles, fostering trust.

---

## 🛠️ Technical Architecture

### **Backend (Python 3.11 / FastAPI)**
- **API Framework**: High-performance asynchronous endpoints.
- **ORM**: SQLAlchemy with Alembic for robust database migrations.
- **Security**: JWT tokens for stateless session management.
- **ML Pipeline**: Scikit-learn models trained on 19+ features (NDCG@Mean 1.0 performance).
- **Background Tasks**: APScheduler for periodic news sync and data cleanup.

### **Frontend (React 18 / Vite)**
- **State Management**: React Context API for global auth and notification states.
- **UI/UX**: Tailwind CSS for responsive styling, Framer Motion for premium micro-animations.
- **Iconography**: Lucide-React for consistent visual language.
- **Communication**: REST API polling and simulated client-side updates.

### **Data & Infrastructure**
- **Database**: PostgreSQL for transactional data; SQLite supported for local lightweight testing.
- **Orchestration**: Docker Compose for single-command deployment of the full stack.

---

## 📁 Repository Structure

```
EmpathI/
├── backend/
│   ├── api/v1/endpoints/     # Modular API route handlers
│   ├── core/                  # Security, Logging, and Config
│   ├── ml/                    # Feature engineering & ML models
│   ├── models.py              # Central SQLAlchemy entity definitions
│   ├── schemas.py             # Pydantic data validation
│   ├── services/              # Business logic (AVRE, News, Matching)
│   ├── repositories/          # Optimized database access layer
│   └── tests/                 # Automated end-to-end endpoint tests
├── frontend/
│   ├── src/pages/             # Highly modular page components
│   ├── src/components/        # Atomic UI components
│   ├── src/context/           # Global state providers
│   └── src/services/          # Frontend-to-Backend API bridge
├── docker-compose.yml         # Container definitions
└── .env.example               # Environment template
```

---

## 🚀 Quick Start & Deployment

### 1. **Clone & Config**
```bash
git clone https://github.com/sanatK24/empathi-avre.git
cd empathi-avre
cp .env.example .env
```

### 2. **Docker Launch (Recommended)**
```bash
docker compose up --build
```
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs

### 3. **Manual Backend Setup**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 🧪 Testing & Data Seeding
Maintain system stability with the comprehensive test suite:
```bash
# Run all endpoint tests
pytest backend/tests/test_all_endpoints.py -v

# Seed marketplace for testing
python backend/seed_marketplace.py
```

---

## 📊 AVRE Ranking Formula
The final relevance score is calculated as a weighted average:
```
Final Score = (α * ML_Prediction) + (β * Urgency) + (γ * Fairness) + (δ * Location_Proximity)
```
*Where α, β, γ, δ are dynamically adjustable weights based on system state.*

---

**Last Updated:** May 2026  
**Version:** 2.2 (Comprehensive Documentation Release)
