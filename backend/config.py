import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Model config for Pydantic V2
    model_config = SettingsConfigDict(
        env_file=".env", 
        extra="ignore"  # Allow extra fields in .env without crashing
    )

    APP_NAME: str = "AVRE"
    DEBUG: bool = True
    SECRET_KEY: str = os.getenv("SECRET_KEY", "DEVELOPMENT_ONLY_INSECURE_KEY")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./avre.db")
    
    # ML Settings
    MODEL_PATH: str = "backend/ml/model.pkl"

    def __init__(self, **values):
        super().__init__(**values)
        if os.getenv("NODE_ENV") == "production" and self.SECRET_KEY == "DEVELOPMENT_ONLY_INSECURE_KEY":
            raise ValueError("PRODUCTION ERROR: SECRET_KEY environment variable MUST be set!")

settings = Settings()
