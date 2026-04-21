# EmpathI Frontend

Modern SaaS-style frontend for the EmpathI Coordination & Matching Engine (AVRE).

## 🐳 Docker Setup (Recommended)

From the project root:
```bash
docker compose up --build
```

## 🛠️ Manual Setup (Legacy)

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment
Create a `frontend/.env.local` or ensure standard `.env` is present in `frontend/`.
```env
VITE_API_URL=http://localhost:8000
```

### 3. Run the Development Server
```bash
npm run dev
```

App runs at `http://localhost:5173`

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page views (Dashboard, Landing, etc.)
│   ├── services/        # API communication (axios)
│   ├── context/         # React Context (Auth, AppState)
│   ├── hooks/           # Custom React hooks
│   └── assets/          # Styles and static images
├── public/              # Static assets
├── vite.config.js       # Vite configuration
├── package.json         # Dependencies and scripts
└── .dockerignore        # Docker optimization
```

## Key Files

- `frontend/src/services/apiService.js`: Centralized API client.
- `frontend/src/context/AuthContext.jsx`: Handles login/JWT state.
- `frontend/vite.config.js`: Dev server and proxy settings.

## Styling

- **Vanilla CSS**: Used for core layout and animations.
- **Tailwind CSS**: Used for utility styling and fast UI building.
- **Framer Motion**: Powering all premium micro-animations.
