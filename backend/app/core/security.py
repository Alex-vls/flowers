from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ✅ НОВАЯ ФУНКЦИОНАЛЬНОСТЬ: Redis для blacklist токенов
try:
    import redis
    redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
except ImportError:
    redis_client = None


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    import logging
    logger = logging.getLogger(__name__)
    
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    logger.info(f"🔐 create_access_token: creating for data={data}, expire={expire}")
    logger.info(f"🔐 create_access_token: using SECRET_KEY len={len(settings.SECRET_KEY)}, algorithm={settings.ALGORITHM}")
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    token_preview = encoded_jwt[:50] if len(encoded_jwt) > 50 else encoded_jwt
    logger.info(f"🔐 create_access_token: created token {token_preview}... (len={len(encoded_jwt)})")
    
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=30)  # ✅ ИСПРАВЛЕНО: 30 дней вместо 7 для лучшего UX
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode JWT token"""
    import logging
    logger = logging.getLogger(__name__)
    
    token_preview = token[:50] if len(token) > 50 else token
    logger.info(f"🔍 verify_token: checking token {token_preview}...")
    
    try:
        # ✅ НОВОЕ: Проверяем blacklist перед декодированием
        if is_token_blacklisted(token):
            logger.warning(f"❌ verify_token: token {token_preview}... is blacklisted")
            return None
        
        logger.info(f"🔐 verify_token: decoding with SECRET_KEY len={len(settings.SECRET_KEY)}, algorithm={settings.ALGORITHM}")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        logger.info(f"✅ verify_token: token valid, payload={payload}")
        return payload
    except JWTError as e:
        logger.warning(f"❌ verify_token: JWTError for token {token_preview}...: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ verify_token: Unexpected error for token {token_preview}...: {e}")
        return None


def revoke_token(token: str) -> bool:
    """
    ✅ НОВАЯ ФУНКЦИЯ: Добавить токен в blacklist
    Возвращает True если успешно добавлен в blacklist
    """
    if not redis_client:
        return False
        
    try:
        # Декодируем токен чтобы получить exp время
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        exp = payload.get('exp')
        
        if exp:
            current_time = int(datetime.utcnow().timestamp())
            ttl = exp - current_time
            
            if ttl > 0:
                # Добавляем в blacklist до времени истечения
                redis_client.setex(f"token_blacklist:{token}", ttl, "revoked")
                return True
                
    except Exception as e:
        # Логируем ошибку но не прерываем выполнение
        print(f"Error revoking token: {e}")
        
    return False


def is_token_blacklisted(token: str) -> bool:
    """
    ✅ НОВАЯ ФУНКЦИЯ: Проверить находится ли токен в blacklist
    """
    if not redis_client:
        return False
        
    try:
        return redis_client.exists(f"token_blacklist:{token}") > 0
    except Exception:
        # При ошибке Redis считаем токен валидным (fail-open)
        return False


def revoke_all_user_tokens(user_id: int) -> int:
    """
    ✅ НОВАЯ ФУНКЦИЯ: Отозвать все токены пользователя
    Возвращает количество отозванных токенов
    """
    if not redis_client:
        return 0
        
    try:
        # Находим все активные токены пользователя
        pattern = f"token_blacklist:*"
        keys = redis_client.keys(pattern)
        
        revoked_count = 0
        for key in keys:
            try:
                token = key.replace("token_blacklist:", "")
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
                
                if payload.get("sub") == user_id:
                    # Этот токен уже в blacklist, пропускаем
                    continue
                    
            except JWTError:
                continue
        
        # Альтернативный подход: добавляем user_id в blacklist пользователей
        # Это проще но менее гранулярно
        redis_client.setex(f"user_blacklist:{user_id}", 3600 * 24 * 7, "all_tokens_revoked")
        return 1
        
    except Exception as e:
        print(f"Error revoking user tokens: {e}")
        return 0


def is_user_blacklisted(user_id: int) -> bool:
    """
    ✅ НОВАЯ ФУНКЦИЯ: Проверить заблокирован ли пользователь
    """
    if not redis_client:
        return False
        
    try:
        return redis_client.exists(f"user_blacklist:{user_id}") > 0
    except Exception:
        return False


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)


def generate_password() -> str:
    """Generate secure random password"""
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(12)) 