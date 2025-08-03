from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Humanoid Training Platform"
    ENVIRONMENT: str = "development"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/humanoid_training"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8080",
        "http://localhost:19006",  # Expo dev server
        "exp://192.168.1.100:19000",  # Expo mobile
    ]
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # AWS S3 (optional)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_BUCKET: Optional[str] = None
    
    # File Upload
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    ALLOWED_VIDEO_TYPES: List[str] = ["video/mp4", "video/webm", "video/quicktime"]
    
    # Robot Connection
    ROBOT_COMMAND_TIMEOUT: int = 30
    MAX_ROBOT_CONNECTIONS: int = 10
    
    # Hand Tracking
    HAND_TRACKING_FPS: int = 30
    MAX_GESTURE_DURATION: int = 300  # 5 minutes
    
    # Marketplace
    MIN_SKILL_PRICE: float = 0.01
    MAX_SKILL_PRICE: float = 1000.0
    MARKETPLACE_FEE_PERCENTAGE: float = 0.05  # 5%
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()