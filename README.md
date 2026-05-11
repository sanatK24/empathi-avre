# EmpathI - Adaptive Vendor Relevance Engine (AVRE)

**EmpathI** is a comprehensive humanitarian resource matching and donation platform that combines emergency response logistics with community-driven fundraising. The platform empowers requesters to find vendors for critical resources while enabling donors to support communities through campaign donations.

Built with **FastAPI + React + PostgreSQL**, EmpathI features an intelligent matching engine, vendor marketplace, real-time notifications, and a community-driven campaign system.

---

## 🎯 Core Features

### 1. **User Roles & Authentication**
- **Requester** - Creates resource requests, receives vendor matches, fundraises through campaigns
- **Vendor** - Lists inventory, responds to requests, manages fulfillment
- **Admin** - Moderation, user management, campaign verification, system analytics
- JWT-based secure authentication with role-based access control

### 2. **Resource Matching (AVRE)**
- Hybrid ML + rule-based ranking system
- Fairness penalties to prevent vendor monopoly
- Distance-aware scoring with service radius
- Real-time match notifications via WebSocket
- Intelligent fallback to rule-based system if ML unavailable

### 3. **Campaign System**
- **Create Campaigns** - Requesters launch donation campaigns with goals and urgency levels
- **Browse Campaigns** - Discover active campaigns filtered by category, city, urgency
- **Donate** - Support campaigns with secure payment integration
- **Campaign Analytics** - Track fundraising progress, donor count, analytics
- **Public Preview** - Campaign owners see exactly how their campaigns appear to donors

### 4. **Vendor Marketplace**
- **Vendor Discovery** - Browse vendors by location, category, rating, availability
- **Storefront** - Each vendor has a dedicated storefront showing inventory
- **Inventory Management** - Vendors manage products, stock, expiry dates
- **Vendor Analytics** - Track completions, reliability score, fairness metrics
- **Rating System** - Feedback from requesters improves vendor reputation

### 5. **Social Features**
- **Public Profiles** - View creator profiles, campaigns, follower counts
- **Follow System** - Follow vendors/requesters to track their activities
- **Saved Campaigns** - Bookmark campaigns for later donation
- **Follower Lists** - See who follows you and who you're following
- **Profile Cards** - Clickable creator names on campaigns link to public profiles

### 6. **Smart Recommendations**
- **AI-Powered Feed** - Personalized campaign recommendations based on:
  - User donation history and interests
  - Geographic proximity
  - Verification status and urgency
- **Masonry Grid Layout** - Beautiful visual campaign discovery
- **Match Scoring** - Displays relevance percentage for each campaign

### 7. **Emergency System**
- **Emergency Directory** - National and city-specific emergency contacts
- **Public Facilities** - Hospitals, trauma centers, blood banks with ratings
- **Location-Based Lookup** - Find nearest facilities with directions
- **User Emergency Contacts** - Save personal emergency contacts

### 8. **Admin Dashboard**
- **System Statistics** - Overview of users, vendors, campaigns, matching activity
- **Campaign Verification** - Review and verify new campaigns
- **Campaign Moderation** - Flag inappropriate campaigns
- **User Management** - View all users with roles and activity
- **Vendor Management** - Verify, review, and manage vendor profiles
- **Admin Auth** - Special admin-only endpoints with elevated permissions

### 9. **Real-Time Notifications**
- WebSocket-based real-time event streaming
- Room-based routing (vendor, requester, admin contexts)
- Events: match updates, verification status, flagging alerts
- RabbitMQ integration for event distribution
- Graceful degradation if RabbitMQ unavailable

### 10. **Responsive Design**
- Fully optimized for mobile, tablet, and desktop
- Dark-mode friendly color palette
- Accessibility features and inclusive design patterns

---

## 📁 Repository Structure

```
EmpathI/
├── backend/
│   ├── main.py                          # FastAPI app entry point
│   ├── models.py                        # Database models (User, Campaign, Request, Donation, etc.)
│   ├── schemas.py                       # Pydantic request/response schemas
│   ├── database.py                      # SQLAlchemy setup
│   ├── core/
│   │   ├── security.py                  # JWT auth, password hashing
│   │   └── config.py                    # Environment configuration
│   ├── api/v1/
│   │   ├── endpoints/
│   │   │   ├── auth.py                  # Login, register, profile
│   │   │   ├── campaigns.py             # Campaign CRUD, donations, recommendations
│   │   │   ├── vendors.py               # Vendor discovery, storefront
│   │   │   ├── requests.py              # Resource requests, matching
│   │   │   ├── users.py                 # Public profiles, follow system
│   │   │   ├── emergency.py             # Emergency contacts, facilities
│   │   │   └── admin.py                 # Admin moderation, verification
│   │   └── router.py                    # Route aggregation
│   ├── services/
│   │   ├── campaign_service.py          # Campaign logic, recommendations
│   │   ├── empathi_engine.py            # AVRE matching engine
│   │   ├── feature_builder.py           # ML feature engineering
│   │   └── product_lookup_service.py    # Inventory matching
│   ├── repositories/
│   │   ├── campaign_repo.py             # Campaign queries
│   │   ├── donation_repo.py             # Donation queries
│   │   └── vendor_repo.py               # Vendor queries
│   ├── ml/
│   │   ├── features.py                  # Feature engineering pipeline
│   │   └── ml_artifacts/                # Trained models, encoders
│   ├── tests/
│   │   └── test_all_endpoints.py        # Comprehensive endpoint tests
│   ├── seed_*.py                        # Data seeding scripts
│   └── requirements.txt                 # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── UserDashboard.jsx        # Requester home
│   │   │   ├── VendorDashboard.jsx      # Vendor home
│   │   │   ├── AdminDashboard.jsx       # Admin home
│   │   │   ├── CampaignsFeedPage.jsx    # Campaign browser
│   │   │   ├── CampaignCreationPage.jsx # Create campaign
│   │   │   ├── CampaignDetailPage.jsx   # Campaign details, donations
│   │   │   ├── CampaignAnalyticsDashboard.jsx  # Campaign owner analytics
│   │   │   ├── PublicProfilePage.jsx    # Public user profiles
│   │   │   ├── RecommendationsPage.jsx  # Personalized campaign feed
│   │   │   ├── VendorMarketplace.jsx    # Vendor discovery
│   │   │   ├── VendorStorefront.jsx     # Individual vendor store
│   │   │   ├── InventoryManagement.jsx  # Vendor inventory
│   │   │   ├── EmergencyHub.jsx         # Emergency resources
│   │   │   ├── AdminCampaigns.jsx       # Admin campaign moderation
│   │   │   ├── AdminVendorManagement.jsx # Admin vendor management
│   │   │   └── SharedProfileDashboard.jsx # User profile settings
│   │   ├── components/
│   │   │   ├── DonationModal.jsx        # Donation flow
│   │   │   ├── NotificationBell.jsx     # Real-time notifications
│   │   │   ├── ResourceCard.jsx         # Campaign/request card component
│   │   │   ├── ui/                      # Reusable UI components
│   │   │   └── ...
│   │   ├── context/
│   │   │   ├── AppContext.jsx           # Global auth & user state
│   │   │   ├── NotificationContext.jsx  # Real-time notifications
│   │   │   └── ResourceContext.jsx      # Resource management
│   │   ├── services/
│   │   │   ├── apiService.js            # API client with all endpoints
│   │   │   ├── newsService.js           # News/update fetching
│   │   │   └── dataService.js           # Data processing utilities
│   │   ├── layouts/
│   │   │   ├── PublicLayout.jsx         # Landing page layout
│   │   │   └── DashboardLayout.jsx      # Authenticated dashboard layout
│   │   └── App.jsx                      # Main app routing
│   ├── package.json
│   └── vite.config.js
│
├── docker-compose.yml                   # Complete stack (backend, frontend, DB, RabbitMQ)
├── .env.example                         # Environment template
├── .gitignore
└── README.md                            # This file
```

---

## 🛠️ Tech Stack

**Backend:**
- FastAPI (async Python web framework)
- SQLAlchemy (ORM for database operations)
- Pydantic (data validation)
- JWT + bcrypt/passlib (authentication & security)
- scikit-learn (ML/ranking)
- pandas/numpy (data processing)
- aio-pika (RabbitMQ async client)
- WebSocket (real-time communication)

**Frontend:**
- React 18 (UI framework)
- Vite (build tool)
- React Router (navigation)
- Framer Motion (animations)
- Tailwind CSS (styling)
- Lucide Icons (icon library)
- Axios (HTTP client)

**Database:**
- PostgreSQL (primary database)
- SQLAlchemy migrations (alembic)

**Infrastructure:**
- Docker & Docker Compose (containerization)
- Render (backend hosting)
- RabbitMQ (message queuing)
- WebSocket (real-time transport)

---

## 🚀 Quick Start

### Prerequisites
- Docker Desktop: [Download](https://www.docker.com/products/docker-desktop/)
- Git
- (Optional) Python 3.10+, Node.js 18+ for manual setup

### Option 1: Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/sanatK24/empathi-avre.git
cd empathi-avre

# Setup environment
cp .env.example .env

# Launch entire stack
docker compose up --build
```

**Services available at:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- RabbitMQ: http://localhost:15672 (guest/guest)
- PostgreSQL: localhost:5432

### Option 2: Manual Setup

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 🔐 Environment Variables

Create `.env` file in backend directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/empathi

# Security
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256

# API
API_HOST=http://localhost:8000
VITE_API_BASE_URL=http://localhost:8000

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/
ENABLE_RABBITMQ=true

# Email (optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
```

---

## 📊 Core Workflows

### 1. Resource Request & Matching
```
Requester creates request 
  → AVRE analyzes and scores available vendors
  → Top matches ranked by relevance
  → Vendors notified via WebSocket
  → Accept/reject workflow
  → Real-time status updates
```

### 2. Campaign Fundraising
```
Requester creates campaign
  → Campaign verified by admin
  → Listed in campaigns feed
  → Donors browse and donate
  → Real-time progress updates
  → Campaign analytics tracked
```

### 3. Vendor Discovery
```
Browse marketplace
  → Filter by category/location/rating
  → View vendor storefront
  → See inventory & reviews
  → Request resources
  → Track transaction history
```

### 4. Social Engagement
```
Click creator name on campaign
  → View public profile
  → See all their campaigns
  → Follow/unfollow them
  → Check follower counts
  → Save campaigns to bookmarks
```

---

## 🧪 Testing

**Run all endpoint tests:**
```bash
cd backend
pytest tests/test_all_endpoints.py -v
```

**Seed test data:**
```bash
# Create 10 sample users with campaigns
python seed_campaigns.py

# Create vendor marketplace data
python seed_marketplace.py

# Create vendor + inventory data
python seed_vendors.py
```

---

## 📈 AVRE Ranking System

The hybrid ranking engine combines multiple signals:

```
Final Score = α·ML_score + β·Urgency + γ·Fairness + δ·Stock + ε·Freshness
```

**Components:**
- **ML Score** - Trained model prediction (RandomForest, achieves NDCG@1.0)
- **Urgency Adjustment** - Boost for critical/high requests
- **Fairness Boost** - Prevent vendor monopoly
- **Stock Confidence** - Prefer vendors with recent inventory
- **Freshness Score** - Recent matches ranked higher
- **Business Filters** - Hard eligibility checks before ranking

**ML Performance:**
- RandomForest: NDCG@Mean 1.0000 (winner)
- GradientBoosting: NDCG@Mean 1.0000
- 19 engineered features across logistics, trust, operations

---

## 🔄 Database Migrations

```bash
# Apply latest migrations
docker compose exec backend alembic upgrade head

# Create migration after model changes
docker compose exec backend alembic revision --autogenerate -m "description"

# View migration history
docker compose exec backend alembic history
```

---

## 🌐 API Endpoints

### Authentication
- `POST /auth/register` - Create new account
- `POST /auth/login` - Get JWT token
- `GET /auth/profile` - Current user profile
- `PUT /auth/profile` - Update profile

### Campaigns
- `GET /campaigns` - List all active campaigns
- `POST /campaigns` - Create new campaign
- `GET /campaigns/{id}` - Campaign details
- `POST /campaigns/{id}/donate` - Make donation
- `GET /campaigns/my` - Your created campaigns
- `GET /campaigns/recommendations` - Personalized feed
- `POST /campaigns/{id}/save` - Save campaign
- `GET /campaigns/saved` - Your saved campaigns

### Users & Profiles
- `GET /users/{user_id}/profile` - Public profile
- `POST /users/{user_id}/follow` - Follow user
- `DELETE /users/{user_id}/follow` - Unfollow user
- `GET /users/{user_id}/followers` - List followers
- `GET /users/{user_id}/campaigns` - User's campaigns

### Vendors
- `GET /vendors/discovery` - Browse vendors
- `GET /vendors/{id}/storefront` - Vendor storefront
- `GET /vendors/{id}/inventory` - Vendor products

### Requests & Matching
- `POST /requests` - Create resource request
- `GET /matches` - Your received matches
- `PUT /matches/{id}/accept` - Accept match
- `PUT /matches/{id}/reject` - Reject match

### Admin
- `GET /admin/stats` - System statistics
- `GET /admin/campaigns` - All campaigns
- `PUT /admin/campaigns/{id}/verify` - Verify campaign
- `PUT /admin/campaigns/{id}/flag` - Flag campaign
- `GET /admin/vendors` - All vendors

Full API documentation: http://localhost:8000/docs

---

## 🚨 Known Issues & Future Improvements

### Known Issues
- Payment integration is mock-based (use test credentials)
- Email notifications not yet implemented
- Real-time WebSocket connection requires active RabbitMQ

### Future Improvements
- [ ] Email/SMS notifications for important updates
- [ ] Advanced search with full-text indexing
- [ ] User ratings & reviews system
- [ ] Automated inventory restocking suggestions
- [ ] Video verification for vendors
- [ ] Community moderation features
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Integration with payment gateways (Razorpay, Stripe)
- [ ] AI-powered chatbot for customer support

---

## 🔒 Security Notes

- Replace `SECRET_KEY` before production
- Use strong passwords and enforce in backend validation
- Use PostgreSQL in production (not SQLite)
- Enable WSS (secure WebSocket) in production
- Validate CORS origins in production
- Implement rate limiting
- Use environment-based secrets management
- Implement request signing for API endpoints

---

## 📝 Development Workflow

1. **Branch naming:** `feature/feature-name`, `fix/bug-name`
2. **Pull requests:** Require peer review before merging to main
3. **Testing:** Run tests before pushing
4. **Database changes:** Create migrations immediately
5. **Commits:** Use descriptive messages
6. **Documentation:** Update README for new features

---

## 🤝 Contributing

This is a two-person collaborative project. When adding features:

1. Discuss scope with teammate
2. Create feature branch
3. Implement with tests
4. Submit PR with description
5. Review and iterate
6. Merge to main after approval

---

## 📚 Additional Resources

- **Backend Documentation:** See `backend/README.md` (if exists)
- **Frontend Components:** See component storybook in `frontend/src/components`
- **Data Models:** See `backend/models.py` for schema
- **API Schema:** See `backend/schemas.py` for request/response formats
- **ML Details:** See `backend/ml/` for ranking engine implementation

---

## 📞 Support & Contact

For issues, feature requests, or questions:
1. Check existing GitHub issues
2. Review documentation above
3. Open new issue with reproduction steps
4. Contact team directly

---

**Last Updated:** May 2026  
**Version:** 2.0 (Campaign + Social Features Release)
