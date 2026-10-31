import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

_BASE_DIR = Path(__file__).resolve().parent.parent
_DEFAULT_SQLITE_URL = f"sqlite:///{(_BASE_DIR / 'campusflow.db').as_posix()}"

class Settings(BaseSettings):
    PROJECT_NAME: str = "CampusFlow — College Management System"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database URL: Supports PostgreSQL (primary) with SQLite fallback for local developer portability
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        _DEFAULT_SQLITE_URL
    )
    
    # JWT Authentication
    SECRET_KEY: str = os.getenv("SECRET_KEY", "campusflow-super-secret-key-change-in-production-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Optional SMTP settings used for email-only password recovery.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True
    FRONTEND_BASE_URL: str = "http://localhost:5173"
    
    # Academic Business Rules
    DEFAULT_ATTENDANCE_THRESHOLD: float = 75.0  # Percentage below which student is defaulter
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()
