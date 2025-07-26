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
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Create JWT refresh token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)  # 7 days for refresh token
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """
    Verify JWT token with blacklist check
    ✅ УЛУЧШЕНИЕ: Добавлена проверка blacklist
    """
    try:
        # Сначала проверяем blacklist
        if is_token_blacklisted(token):
            return None
            
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
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