import sys
import os

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.append(backend_dir)

from config import settings
print("--- DATABASE DEBUG ---")
print("BASE_DIR in config:", os.path.dirname(os.path.abspath(settings.__class__.__module__)))
print("settings.DATABASE_URL:", settings.DATABASE_URL)
db_file = settings.DATABASE_URL.replace("sqlite:///", "")
print("db_file path:", db_file)
print("db_file exists:", os.path.exists(db_file))
if os.path.exists(db_file):
    print("db_file size:", os.path.getsize(db_file))
