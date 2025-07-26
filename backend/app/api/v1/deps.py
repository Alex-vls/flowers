from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import logging

from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_token, is_user_blacklisted
from app.core.user_cache import UserCache
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer()


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Get current authenticated user
    ✅ УЛУЧШЕНИЕ: Добавлено кеширование и проверка user blacklist
    """
    # ✅ ОТЛАДКА: Логируем входящий токен
    token_preview = credentials.credentials[:50] if len(credentials.credentials) > 50 else credentials.credentials
    logger.info(f"🔍 get_current_user: token_preview={token_preview}...")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = verify_token(credentials.credentials)
        if payload is None:
            logger.warning(f"❌ get_current_user: verify_token returned None for token {token_preview}...")
            raise credentials_exception
        # ✅ ИСПРАВЛЕНО: sub теперь строка, конвертируем в int
        user_id_str = payload.get("sub")
        if user_id_str is None:
            logger.warning(f"❌ get_current_user: no 'sub' in token payload for token {token_preview}...")
            raise credentials_exception
        
        try:
            user_id: int = int(user_id_str)
        except (ValueError, TypeError):
            logger.warning(f"❌ get_current_user: invalid 'sub' value {user_id_str} for token {token_preview}...")
            raise credentials_exception
            
        logger.info(f"✅ get_current_user: token valid, user_id={user_id}")
            
        # ✅ НОВАЯ ПРОВЕРКА: User blacklist
        if is_user_blacklisted(user_id):
            logger.warning(f"❌ get_current_user: user {user_id} is blacklisted")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User access revoked"
            )
            
    except JWTError as jwt_error:
        logger.warning(f"❌ get_current_user: JWTError for token {token_preview}...: {jwt_error}")
        raise credentials_exception
    
    # ✅ НОВОЕ: Сначала проверяем кеш
    cached_user_data = UserCache.get_user(user_id)
    if cached_user_data:
        # Создаем User объект из кешированных данных
        user = User()
        for key, value in cached_user_data.items():
            if key == "role":
                # Конвертируем строку обратно в enum
                from app.models.user import UserRole
                value = UserRole(value) if value else UserRole.CLIENT
            elif key in ["created_at", "updated_at"] and value:
                # Конвертируем ISO строки обратно в datetime
                from datetime import datetime
                value = datetime.fromisoformat(value)
            setattr(user, key, value)
        
        # Проверяем активность пользователя
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
            
        return user
    
    # ✅ УЛУЧШЕНИЕ: Если не в кеше, загружаем из DB и кешируем
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Сохраняем в кеш для следующих запросов
    UserCache.set_user(user)
    
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


def get_current_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current admin user"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


def get_current_courier_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current courier user"""
    if current_user.role not in [UserRole.COURIER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user 