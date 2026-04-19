# Adaptive Vendor Relevance Engine (AVRE) - System Documentation

## 1. Architecture Overview

AVRE is built with a modular, scalable architecture using **FastAPI** and **SQLAlchemy**. The system is divided into several core modules to ensure clean separation of concerns:

- **Auth Module**: Handles registration, login, and RBAC using JWT and Bcrypt.
- **Request Module**: Manages resource requests from users.
- **Vendor Module**: Manages vendor profiles and inventory.
- **Matching Engine (Service Layer)**: The "brain" of AVRE, consisting of:
    - `FeatureBuilder`: Converts raw data into normalized features.
    - `BusinessRules`: Applies hard filters (e.g., stock availability).
    - `FairnessManager`: Prevents vendor monopolies.
    - `AVREEngine`: Orchestrates the ranking using a hybrid ML and Rule-based approach.
- **ML Pipeline**: A robust training system that evaluates and saves the best model for relevance prediction.

## 2. Database Schema

- **Users**: Authentication and role details.
- **Vendors**: Profiles, ratings, and location.
- **Inventory**: Real-time stock availability for vendors.
- **Requests**: User needs with urgency levels and locations.
- **Matches**: Records of matching events and scores.
- **Audit Logs**: System-wide traceability.
- **Scoring Config**: Admin-controlled weights for the ranking engine.

## 3. The Novelty: AVRE Ranking Formula

AVRE uses a unique ranking formula designed for emergency resource distribution:

Final Score = α * ML_score + β * Urgency_adj + γ * Fairness_boost + δ * Stock_conf + ε * Freshness_score

- **ML Score**: Prediction from a Gradient Boosting model trained on fulfillment probability.
- **Urgency Adaptation**: Dynamically boosts high-speed vendors for critical requests.
- **Fairness Boost**: Reduces "visibility fatigue" of top vendors to give smaller, reliable providers exposure.
- **Stock Confidence**: Rewards vendors with higher stock-to-request ratios.
- **Freshness Score**: Penalizes vendors with outdated inventory data.

## 4. ML Pipeline Details

The system includes a synthetic data generator that creates realistic request-vendor pairs.
- **Models Compared**: RandomForestRegressor, GradientBoostingRegressor.
- **Selection Metric**: RMSE (Lower is better) and R² (Higher is better).
- **Explainability**: Each match result includes a human-readable explanation of why a vendor was ranked highly.

## 5. Getting Started

### Prerequisites
- Python 3.8+
- SQLite (default) or PostgreSQL

### Local Setup
1. **Install Dependencies**:
   ```bash
   pip install -r backend/requirements.txt
   ```

2. **Train the ML Model**:
   ```bash
   python backend/ml/train.py
   ```

3. **Run the Server**:
   ```bash
   uvicorn main:app --reload
   ```

4. **Explore API**:
   Open `http://localhost:8000/docs` for Swagger UI.

## 6. Future Upgrades
- **Real-time GPS Tracking**: Integrate live vendor movement.
- **Advanced SHAP Analysis**: For deeper explainability of ML scores.
- **Multi-Category Aggregation**: Allow one request to match across multiple vendor types (e.g., Food + Water).
