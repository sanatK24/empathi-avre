import os
import sys

# Ensure backend is in path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import engine, Base
import models # Ensure all models are imported so Base knows about them

def reset_db():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables...")
    Base.metadata.create_all(bind=engine)
    print("Database reset complete.")

if __name__ == "__main__":
    reset_db()
