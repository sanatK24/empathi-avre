# AVRE Realistic Data Generation System

This system generates production-style realistic data for the Adaptive Vendor Relevance Engine (AVRE), specifically tailored for the Indian context.

## Overview

The system creates:
- **Realistic Indian Users**: Names, emails, and valid phones within the Indian locale.
- **Vendors**: Authentic shop names, categories (Pharmacy, Oxygen, Relief, etc.), and real-world Indian coordinates.
- **Inventory**: Contextually relevant items with prices in INR, SKUs, and expiry dates.
- **Requests**: Urgent needs with varying priority levels and logically consistent locations.
- **Matches**: Ranked matches with ML and Rule-based scores.
- **Audit Logs**: Traceable events for monitoring.

## Setup

1. **Install Dependencies**:
   ```bash
   pip install -r seed/requirements.txt
   ```

2. **Run Seeding**:
   Use `seed_sqlite.py` to populate the `avre.db`. You can choose the scale: `small`, `medium`, or `large`.
   ```bash
   # Create a medium dataset
   python seed/seed_sqlite.py --scale medium --clear
   ```

3. **Validate Data**:
   Ensure everything is logically consistent and within bounds.
   ```bash
   python seed/validators.py
   ```

## Files

- `generate_data.py`: Core logic for data abstraction and generation.
- `seed_sqlite.py`: Script to insert data into SQLite using SQLAlchemy models.
- `schema.sql`: Raw SQL schema for reference or direct initialization.
- `validators.py`: Sanity checks for the generated data.
- `requirements.txt`: Specific tools needed for generation (Faker, geopy, etc.).

## Realism Features

- **Geospatial Proximity**: Coordinates are clustered around major Indian cities (Mumbai, Bengaluru, Delhi, etc.).
- **Domain Consistency**: Pharmacy vendors sell medicines, not oxygen cylinders by default (unless expanded).
- **ML Training Ready**: Includes scores, feedback loops, and response times for model training.
- **Temporal Realism**: `created_at` and `updated_at` fields are spaced out realistically over time.
