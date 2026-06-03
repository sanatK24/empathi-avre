import os
import sys
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from database import engine, Base
import models

def reset_db():
    print('Dropping all tables...')
    Base.metadata.drop_all(bind=engine)
    print('Creating all tables...')
    Base.metadata.create_all(bind=engine)
    print('Database reset complete.')
if __name__ == '__main__':
    reset_db()