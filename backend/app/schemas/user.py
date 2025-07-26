from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    address: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    preferences: Optional[str] = None


class UserInDB(UserBase):
    id: int
    telegram_id: Optional[str] = None
    role: UserRole
    is_active: bool
    is_verified: bool
    bonus_points: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class User(UserInDB):
    pass


class UserProfile(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    bonus_points: int
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(UserCreate):
    pass


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


# Новые схемы для четкого разделения
class TelegramMiniAppAuthRequest(BaseModel):
    """Схема для авторизации через Telegram Mini App"""
    init_data: str          # Полные данные от Telegram WebApp (содержит hash внутри)


class TelegramWebsiteAuthRequest(BaseModel):
    """Схема для авторизации через веб-сайт (Login Widget)"""
    id: str                 # Telegram user ID
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int          # Unix timestamp
    hash: str               # Подпись от Telegram


class AuthResponse(BaseModel):
    """Унифицированный ответ авторизации"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: dict
    is_new_user: bool
    auth_method: str        # "miniapp" или "website" 