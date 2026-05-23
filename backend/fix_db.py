import sqlite3

def create_tables():
    try:
        conn = sqlite3.connect('../empathi.db')
        cursor = conn.cursor()
        
        print("Creating campaign_creator_trust...")
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS campaign_creator_trust (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            identity_verified BOOLEAN DEFAULT 0,
            historical_fulfillment_rate FLOAT DEFAULT 1.0,
            dispute_rate FLOAT DEFAULT 0.0,
            anomaly_score FLOAT DEFAULT 0.0,
            composite_trust_score FLOAT DEFAULT 0.80,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """)
        
        conn.commit()
        print("Created successfully.")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    create_tables()
