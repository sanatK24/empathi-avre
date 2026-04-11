# AVRE Backend

Adaptive Vendor Relevance Engine - FastAPI backend service.

## Setup

### 1. Create Virtual Environment
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 2. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Run the Server
```bash
python main.py
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
├── auth.py              # JWT authentication & password hashing
├── avre_engine.py       # Core scoring & matching logic
├── routes/
│   ├── auth_routes.py       # Register/Login endpoints
│   ├── vendor_routes.py      # Vendor operations
│   ├── requester_routes.py   # Requester operations
│   ├── admin_routes.py       # Admin operations
│   └── __init__.py
├── requirements.txt     # Python dependencies
└── README.md            # This file
```

## API Endpoints

### Authentication
- `POST /register` - Create new account
- `POST /login` - Get JWT token

### Requester
- `POST /requests` - Submit resource request
- `GET /requests` - View request history
- `GET /requests/{id}/matches` - Get ranked vendors (triggers AVRE)
- `POST /requests/{id}/accept/{vendor_id}` - Accept vendor

### Vendor
- `POST /vendor/register` - Create vendor profile
- `GET /vendor/profile` - Get vendor info
- `PUT /vendor/profile` - Update profile
- `POST /vendor/inventory` - Add item
- `GET /vendor/inventory` - List inventory
- `PUT /vendor/inventory/{id}` - Update item
- `DELETE /vendor/inventory/{id}` - Delete item
- `GET /vendor/requests` - View incoming matches
- `POST /vendor/requests/{id}/accept` - Accept match
- `POST /vendor/requests/{id}/reject` - Reject match

### Admin
- `GET /admin/stats` - System statistics
- `GET /admin/users` - List all users
- `DELETE /admin/users/{id}` - Delete user
- `GET /admin/vendors` - List all vendors
- `POST /admin/vendors/{id}/deactivate` - Deactivate vendor
- `POST /admin/vendors/{id}/activate` - Activate vendor
- `GET /admin/requests` - List all requests
- `GET /admin/scoring-weights` - Get AVRE weights
- `PUT /admin/scoring-weights` - Update AVRE weights

## AVRE Scoring Formula

```
Score = (w1 × distance_score) + (w2 × stock_score) + (w3 × rating_score) + (w4 × speed_score) + urgency_bonus

Default Weights:
- Distance: 35%
- Stock: 20%
- Rating: 15%
- Speed: 15%
- Urgency: 15%
```

## Database

Uses SQLite for MVP. Schema includes:
- `users` - All accounts (requester, vendor, admin)
- `vendors` - Shop profiles & locations
- `inventory` - Available resources per vendor
- `requests` - User resource requests
- `matches` - AVRE scoring results

## Key Features (Phase 2)

✅ User authentication with JWT  
✅ Role-based access control (RBAC)  
✅ Vendor profile & inventory management  
✅ Resource request submission  
✅ AVRE matching engine with 5-factor scoring  
✅ Match ranking & acceptance workflow  
✅ Admin oversight & data management  
✅ Database persistence with SQLAlchemy  

## Next : Phase 3

- Vendor notifications when matched
- Request history with detailed outcomes
- Vendor rating system
- Advanced filtering & search

## Notes

- Change `SECRET_KEY` in `auth.py` for production
- Use PostgreSQL instead of SQLite for production
- Deploy backend on Render or similar free-tier service
