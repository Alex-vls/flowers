from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://flowersub:flowersub123@localhost/flowersub"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:5173", "https://msk-flower.su"]
    
    # Email
    SMTP_TLS: bool = True
    SMTP_PORT: Optional[int] = None
    SMTP_HOST: Optional[str] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAILS_FROM_EMAIL: Optional[str] = None
    EMAILS_FROM_NAME: Optional[str] = None
    
    # YooMoney
    YOOMONEY_SHOP_ID: str = "your-shop-id"
    YOOMONEY_SECRET_KEY: str = "your-secret-key"
    
    # Telegram Bot - ✅ ИСПРАВЛЕНО: Убрал hardcoded токен, теперь читаем из ENV
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_BOT_USERNAME: str = "Flower_Moscow_appbot"
    TELEGRAM_WEBHOOK_URL: str = "https://msk-flower.su/api/v1/telegram/webhook"
    
    # Yandex Delivery API
    YANDEX_DELIVERY_TOKEN: str = ""
    YANDEX_DELIVERY_CLIENT_ID: str = ""
    YANDEX_DELIVERY_WEBHOOK_URL: str = "https://msk-flower.su/api/v1/delivery/webhook"
    YANDEX_PICKUP_ADDRESS: str = "Москва, ул. Примерная, д. 1"  # Адрес склада/магазина
    YANDEX_PICKUP_PHONE: str = "+7(999)123-45-67"  # Телефон для связи с курьером
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # App
    APP_NAME: str = "MSK Flower API"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "API для сервиса доставки цветов MSK Flower"
    PROJECT_NAME: str = "MSK Flower API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"
    
    # Security
    FIRST_SUPERUSER: str = "admin@msk-flower.su"
    FIRST_SUPERUSER_PASSWORD: str = "admin123"
    
    # File upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # Delivery
    DEFAULT_DELIVERY_FEE: int = 200
    FREE_DELIVERY_THRESHOLD: int = 2000
    
    # Bonus system
    REFERRAL_BONUS_POINTS: int = 500
    PURCHASE_BONUS_PERCENT: float = 0.05  # 5%
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings() 