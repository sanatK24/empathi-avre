# EmpathI Realistic Data Generation System

This system generates production-style realistic data for the Adaptive Vendor Relevance Engine (AVRE), specifically tailored for the Indian context.

## 🚀 Recommended Usage

As of the latest containerization update, you should use the database-agnostic seeding script located at `backend/seed_db.py`.

From the project root:
```bash
docker compose exec backend python seed_db.py --scale medium
```

## Legacy / Direct Usage

If you are running outside of Docker:
1. **Install Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Run Seeding**:
   ```bash
   python backend/seed_db.py --scale small
   ```

## Files in this directory

- `backend/seed/generate_data.py`: Core logic for data abstraction and generation (used by `seed_db.py`).
- `backend/seed/validators.py`: Sanity checks for the generated data.
- `backend/seed/requirements.txt`: Specific tools needed for generation (Faker, etc.).
- `backend/seed/schema.sql`: Raw SQL schema for reference.

## Realism Features

- **Geospatial Proximity**: Coordinates are clustered around major Indian cities (Mumbai, Bengaluru, Delhi, etc.).
- **Domain Consistency**: Pharmacy vendors sell medicines, not oxygen cylinders by default.
- **ML Training Ready**: Includes scores, feedback loops, and response times for model training.
- **Temporal Realism**: `created_at` and `updated_at` fields are spaced out realistically over time.
