import os
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Settings(BaseSettings):
    # Model config for Pydantic V2
    model_config = SettingsConfigDict(
        env_file=os.path.join(BASE_DIR, ".env"), 
        extra="ignore"  # Allow extra fields in .env without crashing
    )

    APP_NAME: str = "EmpathI"
    DEBUG: bool = True
    SECRET_KEY: str = os.getenv("SECRET_KEY", "DEVELOPMENT_ONLY_INSECURE_KEY")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'empathi.db')}")
    
    # Real-time Settings
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost/")
    ENABLE_RABBITMQ: bool = os.getenv("ENABLE_RABBITMQ", "True").lower() == "true"
    
    # ML Settings
    MODEL_PATH: str = "backend/ml/model.pkl"
    DEFAULT_ML_SCORE: float = 0.5
    MAX_MATCH_DISTANCE_KM: float = 50.0
    PROXIMITY_THRESHOLD_KM: float = 5.0
    ULTRA_PROXIMITY_THRESHOLD_KM: float = 2.0

    def __init__(self, **values):
        super().__init__(**values)
        if os.getenv("NODE_ENV") == "production" and self.SECRET_KEY == "DEVELOPMENT_ONLY_INSECURE_KEY":
            raise ValueError("PRODUCTION ERROR: SECRET_KEY environment variable MUST be set!")

settings = Settings()
