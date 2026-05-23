# EmpathI - AI-Powered Crowdfunding Platform

**EmpathI** is a modern, intelligence-driven crowdfunding platform designed to maximize the impact of community fundraising. By leveraging advanced Machine Learning and Trust AI, EmpathI ensures that high-priority campaigns reach the right donors, creating a fair, transparent, and highly personalized giving experience.

Built with a sleek **FastAPI + React + SQLite/PostgreSQL** stack, EmpathI represents the next generation of social impact platforms.

---

## 🚀 Key Features & AI Engines

### 1. **Intelligent Campaign Ranking**
Our proprietary **Campaign Ranker (LightGBM)** ensures the campaign discovery feed is never static. 
- **Personalized Recommendations**: Learns from donor history and preferences.
- **Geographic Proximity**: Surfaces local community causes first.
- **Urgency Boost**: Automatically accelerates campaigns flagged as critical.

### 2. **Trust & Fraud Prevention Engine**
EmpathI calculates a dynamic **Creator Trust Score** for every campaign runner.
- Evaluates historical fulfillment and dispute rates.
- Anomaly detection prevents spam and fraudulent campaigns from gaming the system.
- Ensures a safe ecosystem for donors.

### 3. **Fairness-Aware Allocation**
Our **Fairness Engine** guarantees that new and niche campaigns aren't buried under viral ones.
- **Impression Balancing**: Actively monitors how many times a campaign is shown.
- **Diversity Constraints**: Forces the feed to display a diverse mix of categories (e.g., Medical, Education, Tech) rather than an echo chamber.

### 4. **User & Creator Ecosystem**
- **Unified Auth System**: Secure JWT-based authentication.
- **Dual Roles**: 
  - **Users**: Can browse, save, and donate to campaigns, tracking their impact through a beautiful dashboard.
  - **Creators**: Can launch and manage rich campaigns, post updates, and track analytics.
- **Public Profiles**: Dynamic profile cards showing user activity, follower counts, and contribution history.

### 5. **Interactive Campaign Experience**
- **Campaign Analytics**: Creators can track donor counts, funding velocity, and average donations.
- **Masonry Discovery**: A visually stunning, Pinterest-style grid for exploring campaigns.
- **Updates & Community**: Creators can post pinned updates; donors can leave supportive messages.

---

## 🛠️ Technical Architecture

### **Backend (Python 3.11 / FastAPI)**
- **API Framework**: High-performance asynchronous endpoints.
- **ORM**: SQLAlchemy with Alembic for robust database migrations.
- **Security**: JWT tokens for stateless session management.
- **ML Pipeline**: Scikit-learn and LightGBM integrated directly into the core service layer.
- **Background Tasks**: FastAPI BackgroundTasks for analytics generation.

### **Frontend (React 18 / Vite)**
- **UI/UX**: Tailwind CSS for responsive styling, Framer Motion for premium micro-animations.
- **Iconography**: Lucide-React for consistent visual language.
- **Component Design**: Highly modular, reusable components built with Radix UI primitives.

### **Data & Infrastructure**
- **Database**: SQLite for local testing (production-ready for PostgreSQL).

---

## 📁 Repository Structure

```text
EmpathI/
├── backend/
│   ├── api/v1/endpoints/     # API route handlers
│   ├── core/                  # Security, Logging, and Config
│   ├── ml/                    # Feature engineering & ML rankers
│   ├── models.py              # SQLAlchemy entity definitions
│   ├── schemas.py             # Pydantic data validation
│   ├── services/              # AI Engines (Trust, Fairness)
│   ├── repositories/          # Database access layer
│   └── fix_db.py              # Migration and repair scripts
├── frontend/
│   ├── src/pages/             # Highly modular page components
│   ├── src/components/        # Atomic UI components
│   └── src/services/          # Frontend-to-Backend API bridge
└── README.md                  # Project documentation
```

---

## 🚀 Quick Start & Deployment

### 1. **Clone & Config**
```bash
git clone https://github.com/sanatK24/empathi-avre.git
cd empathi-avre
cp .env.example .env
```

### 2. **Backend Setup**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. **Frontend Setup**
```bash
cd ../frontend
npm install
npm run dev
```

---

**Last Updated:** May 2026  
**Status:** V2 Downgrade & Consolidation Complete
