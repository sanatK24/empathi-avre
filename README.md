# EmpathI AVRE

Adaptive Vendor Relevance Engine (AVRE) for emergency and high-priority resource matching.

This repository contains:
- Backend API and matching engine (FastAPI + SQLAlchemy)
- Frontend application (Vite + React)
- ML training and retraining pipeline for ranking quality improvement
- Real-time notification infrastructure (WebSocket + RabbitMQ)

## Current System Status

- Matching engine: Hybrid ML + rule-based ranking in production-ready state
- Real-time notifications: Implemented end-to-end on backend
- Moderation and admin workflows: Implemented
- ML model integration: Implemented with fallback safety
- Deployment target: Configured for Render (backend)

## Highlights From Latest Updates

### 1) Hybrid Ranking Engine (AVRE)

AVRE computes final ranking using multiple components:

```text
Final Score = alpha*ML_score + beta*Urgency_adjustment + gamma*Fairness_boost + delta*Stock_confidence + epsilon*Freshness_score
```

Behavioral highlights:
- Applies hard business eligibility filters before ranking
- Uses fairness penalty/boost to avoid vendor monopoly
- Uses stock and freshness signals for operational reliability
- Includes distance ceiling behavior to prevent over-ranking far vendors
- Falls back safely to rule-based behavior if model assets are unavailable

### 2) ML Pipeline (Latest Reported Results)

From the latest consolidated training report:
- Data audit baseline: 11 vendors, 30 requests, 40 match interactions
- Positive class ratio: 25%
- Engineered features: 19 features across logistics, operations, trust, context
- Leaderboard snapshot:
	- RandomForest: NDCG@Mean 1.0000, MAE 0.3786 (winner)
	- GradientBoosting: NDCG@Mean 1.0000, MAE 0.3653
	- XGBoost: NDCG@Mean 0.8500, MAE 0.4200
- Production verdict in report: GREEN (deployable)

### 3) Retraining Strategy (Operational)

Recommended retrain triggers:
- Schedule-based: weekly (Sunday 02:00)
- Volume-based: every 1000 successful matches
- Performance-based: when top-1 precision drops under threshold window

Promotion guardrails:
- Shadow test before promotion
- Offline benchmark gate
- Latency gate for inference batches

Rollback strategy:
- Keep recent model versions
- Version switch via environment-based model selection

### 4) Real-Time Notification System

Phase 7 backend implementation includes:
- WebSocket endpoint
- Connection manager with room-based routing
- Event emitter and background consumer
- RabbitMQ integration for event distribution
- Route-level event emissions for requester/vendor/admin workflows

WebSocket route:

```text
/ws/{user_id}/{room_type}/{room_id}
```

Room patterns:
- vendor:{vendor_id}
- requester:{requester_id}
- admin

Example events:
- vendor.matched
- match.accepted_by_vendor
- match.rejected_by_vendor
- match.accepted_by_requester
- match.cancelled
- vendor.verified / vendor.rejected / vendor.flagged
- request.flagged

## Repository Layout

```text
.
|- backend/
|  |- main.py
|  |- routes/
|  |- services/
|  |- ml/
|  |- ml_artifacts/
|  |- tests/
|  |- realtime.py
|  |- event_consumer.py
|  |- events.py
|- frontend/
|  |- src/
|  |- package.json
|- docker-compose.yml
|- .env.example
|- render.yaml
```

## Tech Stack

Backend:
- FastAPI
- SQLAlchemy
- Pydantic
- JWT auth + bcrypt/passlib
- RabbitMQ (aio-pika) for real-time event transport

Frontend:
- React
- Vite

ML/Data:
- scikit-learn
- pandas / numpy

## 🐳 Containerized Development (Recommended)

The entire EmpathI environment is dockerized for seamless portability across Windows, macOS, and Linux. This setup includes the FastAPI backend, React frontend, PostgreSQL database, and RabbitMQ messaging.

### 1. Setup

1.  **Install Docker Desktop**: [Download here](https://www.docker.com/products/docker-desktop/)
2.  **Clone the Repo**:
    ```bash
    git clone https://github.com/sanatK24/empathi-avre.git
    cd empathi-avre
    ```
3.  **Configure Environment**:
    ```bash
    cp .env.example .env
    ```
    *Note: If you are accessing the dev environment from a different device on the same network, change `VITE_API_URL` in `.env` to `http://<your-host-ip>:8000`.*

### 2. Launching

Run the entire stack with a single command:

```bash
docker compose up --build
```

**Services will be available at:**
- 🟢 Frontend: [http://localhost:5173](http://localhost:5173)
- 🔵 Backend API: [http://localhost:8000](http://localhost:8000)
- 🟡 Swagger Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- 🟣 RabbitMQ Management: [http://localhost:15672](http://localhost:15672) (guest/guest)
- 🐘 PostgreSQL: `localhost:5432`

### 3. Database Migrations

Since we use PostgreSQL in Docker by default, run migrations after the containers are up:

```bash
# Run migrations to latest state
docker compose exec backend alembic upgrade head

# Seed with initial data (small/medium/large)
docker compose exec backend python seed_db.py --scale medium

# Create a new migration after model changes
docker compose exec backend alembic revision --autogenerate -m "description"
```

### 4. Development Workflow

- **Hot Reload**: Both Frontend (Vite) and Backend (Uvicorn) have hot-reload enabled. Changes to your local files will reflect instantly inside the containers.
- **Node Modules**: `node_modules` are managed inside the container via anonymous volumes to avoid platform conflicts.
- **Logs**: View logs with `docker compose logs -f [service_name]`.
- **Cleanup**: Stop everything with `docker compose down`. To remove volumes (reset DB), use `docker compose down -v`.

---

## 🛠️ Manual (Legacy) Setup

### Backend Setup

```bash
cd backend
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
uvicorn main:app --reload
```

Backend URLs:
- API base: http://localhost:8000
- Swagger docs: http://localhost:8000/docs

### Frontend Setup (Manual)

```bash
cd frontend
npm install
npm run dev
```

## Environment Notes

Backend commonly expects values such as:
- DATABASE_URL
- SECRET_KEY
- RABBITMQ_URL
- ENABLE_RABBITMQ

If RabbitMQ is unavailable, the system is designed to degrade gracefully for direct WebSocket delivery scenarios, but full event persistence/distribution behavior requires RabbitMQ.

## Core Workflows

1. Requester creates request
2. AVRE generates ranked vendor candidates
3. Vendors and requesters receive status notifications in real time
4. Admin can verify/reject/flag entities via moderation endpoints
5. Matching outcomes feed retraining signals

## Testing

From backend directory:

```bash
pytest -q
```

There are also utility scripts and logs in backend for environment validation, data auditing, and integration checks.

## Deployment

Render deployment configuration is included in render.yaml for backend service startup.

## Security and Production Notes

- Replace development secrets before production
- Enforce secure token and environment handling
- Prefer PostgreSQL for production over SQLite
- Use WSS and hardened WebSocket auth/origin validation in production

## Documentation Consolidation

Important details previously spread across separate system and phase docs are consolidated here, including:
- Architecture overview
- Real-time eventing model
- ML performance and retraining policy
- Operational setup guidance
