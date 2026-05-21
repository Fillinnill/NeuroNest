import os
import urllib.parse
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "NeuroNest API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Secret key for JWT
    SECRET_KEY: str = "supersecretkey_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Database
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "root"
    MYSQL_SERVER: str = "localhost"
    MYSQL_PORT: str = "3306"
    MYSQL_DB: str = "neuronest"
    DATABASE_URL: Optional[str] = None
    
    # LLM API
    GEMINI_API_KEY: str = "your_gemini_api_key_here"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
    
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        if self.DATABASE_URL:
            # Replace postgres:// with postgresql:// if needed for SQLAlchemy 1.4+
            db_url = self.DATABASE_URL
            if db_url.startswith("postgres://"):
                db_url = db_url.replace("postgres://", "postgresql://", 1)
            return db_url
            
        port = self.MYSQL_PORT or "3306"
        encoded_password = urllib.parse.quote_plus(self.MYSQL_PASSWORD)
        return f"mysql+pymysql://{self.MYSQL_USER}:{encoded_password}@{self.MYSQL_SERVER}:{port}/{self.MYSQL_DB}"

settings = Settings()
