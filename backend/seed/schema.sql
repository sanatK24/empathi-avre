-- AVRE REALISTIC DATABASE SCHEMA (SQLITE)

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('requester', 'vendor', 'admin')),
    phone TEXT,
    city TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VENDORS TABLE
CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    shop_name TEXT NOT NULL,
    category TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    city TEXT NOT NULL,
    rating REAL DEFAULT 0.0,
    reliability_score REAL DEFAULT 1.0,
    avg_response_time INTEGER DEFAULT 15,
    service_radius REAL DEFAULT 10.0,
    verification_status TEXT CHECK(verification_status IN ('unverified', 'pending', 'verified', 'rejected')) DEFAULT 'unverified',
    opening_hours TEXT,
    is_active BOOLEAN DEFAULT 1,
    total_completed_orders INTEGER DEFAULT 0,
    fairness_penalty REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- INVENTORY TABLE
CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER,
    resource_name TEXT NOT NULL,
    category TEXT NOT NULL,
    sku_code TEXT,
    brand_name TEXT,
    quantity INTEGER NOT NULL,
    reserved_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    price REAL,
    expiry_date TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- REQUESTS TABLE
CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    resource_name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    location_lat REAL NOT NULL,
    location_lng REAL NOT NULL,
    city TEXT NOT NULL,
    urgency_level TEXT CHECK(urgency_level IN ('low', 'medium', 'high', 'critical')),
    preferred_eta INTEGER,
    notes TEXT,
    special_instructions TEXT,
    status TEXT CHECK(status IN ('pending', 'matched', 'accepted', 'completed', 'cancelled')) DEFAULT 'pending',
    requester_rating REAL DEFAULT 5.0,
    payment_mode TEXT DEFAULT 'cod',
    fulfilled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- MATCHES TABLE
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER,
    vendor_id INTEGER,
    score REAL NOT NULL,
    ml_score REAL,
    rule_score REAL,
    explanation_json TEXT,
    response_eta INTEGER,
    selected_flag BOOLEAN DEFAULT 0,
    status TEXT CHECK(status IN ('pending', 'accepted_by_vendor', 'rejected_by_vendor', 'accepted_by_requester', 'cancelled_by_requester', 'completed')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES requests(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    actor_role TEXT,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id INTEGER,
    severity TEXT DEFAULT 'info',
    ip_address TEXT,
    trace_id TEXT,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- SCORING CONFIG TABLE
CREATE TABLE IF NOT EXISTS scoring_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ml_weight REAL DEFAULT 0.4,
    urgency_weight REAL DEFAULT 0.2,
    fairness_weight REAL DEFAULT 0.1,
    stock_weight REAL DEFAULT 0.2,
    freshness_weight REAL DEFAULT 0.1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES for realism and performance
CREATE INDEX idx_vendors_city ON vendors(city);
CREATE INDEX idx_vendors_category ON vendors(category);
CREATE INDEX idx_inventory_resource ON inventory(resource_name);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_matches_request ON matches(request_id);
