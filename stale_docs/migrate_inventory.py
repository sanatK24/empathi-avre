import sqlite3
import os

def migrate():
    db_path = 'backend/empathi.db'
    if not os.path.exists(db_path):
        print("Database not found, will be created on next startup.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    columns_to_add = [
        ('description', 'TEXT'),
        ('image_url', 'VARCHAR'),
        ('specifications', 'TEXT')
    ]

    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE inventory ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name} to inventory table.")
        except sqlite3.OperationalError:
            print(f"Column {col_name} already exists in inventory table.")

    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    migrate()
