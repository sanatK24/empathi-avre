# EmpathI Backend

Adaptive Vendor Relevance Engine (AVRE) - FastAPI backend service.

## 🐳 Docker Setup (Recommended)

From the project root:
```bash
docker compose up --build
```

## 🛠️ Manual Setup (Legacy)

### 1. Create Virtual Environment
```bash
cd backend
python -m venv .venv

# Linux/macOS
source .venv/bin/activate  
# Windows
.venv\Scripts\Activate.ps1
```

### 2. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 3. Run the Server
```bash
# From the project root
uvicorn backend.main:app --reload
# OR from inside backend/
uvicorn main:app --reload
```

Server runs at `http://localhost:8000`
API docs: `http://localhost:8000/docs`

## Project Structure

```
backend/
├── main.py              # FastAPI app entry point
├── database.py          # Database configuration
├── models.py            # SQLAlchemy models
├── schemas.py           # Pydantic validation schemas
├── config.py            # Environment & Settings
├── auth.py              # JWT authentication & password hashing
├── seed_db.py           # Database-agnostic seeding script
├── realtime.py          # WebSocket/RabbitMQ logic
├── event_consumer.py    # Background event processor
├── routes/              # HTTP Route Handlers
├── services/            # Business Logic Layer
├── ml/                  # ML models & training scripts
├── alembic/             # Database migrations
└── requirements.txt     # Python dependencies
```

## Key Files

| File | Purpose |
| :--- | :--- |
| `backend/main.py` | Application entry point and lifespan management |
| `backend/models.py` | Database entity definitions |
| `backend/config.py` | Configuration and environment variable handling |
| `backend/seed_db.py` | Script to populate the DB with mock data |
| `backend/alembic.ini` | Migrations configuration |

## Notes

- Ensure `backend/.env` is configured or use the root-level `.env`.
- Use PostgreSQL (via Docker) for the full feature set (RabbitMQ integration).
- For production, ensure `SECRET_KEY` is randomized.
