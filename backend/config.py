import os
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Settings(BaseSettings):
    # Model config for Pydantic V2
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(BASE_DIR), ".env"), 
        extra="ignore"  # Allow extra fields in .env without crashing
    )

    APP_NAME: str = "EmpathI"
    DEBUG: bool = True
    SECRET_KEY: str = os.getenv("SECRET_KEY", "DEVELOPMENT_ONLY_INSECURE_KEY")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'empathi.db')}")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://empathi-frontend.onrender.com")
    
    # Supabase
    SUPABASE_URL: str | None = os.getenv("SUPABASE_URL")
    SUPABASE_KEY: str | None = os.getenv("SUPABASE_KEY")
    # ML Settings
    HUGGINGFACE_API_KEY: str | None = os.getenv("HUGGINGFACE_API_KEY")
    # If loaded via pydantic env_file, also reflect into process env
    # so that other libraries/tools relying on os.environ behave consistently.

    MODEL_PATH: str = "ml_artifacts/ranker_model.pkl"
    DEFAULT_ML_SCORE: float = 0.5
    MAX_MATCH_DISTANCE_KM: float = 50.0
    PROXIMITY_THRESHOLD_KM: float = 5.0
    ULTRA_PROXIMITY_THRESHOLD_KM: float = 2.0

    def __init__(self, **values):
        super().__init__(**values)

        # Ensure token is also visible via os.environ for libraries that
        # read from the environment rather than from pydantic settings.
        if self.HUGGINGFACE_API_KEY:
            os.environ.setdefault("HUGGINGFACE_API_KEY", self.HUGGINGFACE_API_KEY)
        if os.environ.get("HF_TOKEN") is None and self.HUGGINGFACE_API_KEY:
            os.environ.setdefault("HF_TOKEN", self.HUGGINGFACE_API_KEY)

        if os.getenv("NODE_ENV") == "production" and self.SECRET_KEY == "DEVELOPMENT_ONLY_INSECURE_KEY":
            raise ValueError("PRODUCTION ERROR: SECRET_KEY environment variable MUST be set!")


settings = Settings()
