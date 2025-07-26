"""
🚀 User Caching System
Redis-based кеширование пользователей для улучшения производительности авторизации
"""

import json
import logging
from typing import Optional
from app.core.config import settings
from app.models.user import User

logger = logging.getLogger(__name__)

# Redis connection
try:
    import redis
    redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
except ImportError:
    redis_client = None
    logger.warning("Redis not available - user caching disabled")


class UserCache:
    """Система кеширования пользователей"""
    
    DEFAULT_TTL = 300  # 5 минут
    
    @staticmethod
    def get_user(user_id: int) -> Optional[dict]:
        """
        ✅ Получить пользователя из кеша
        Возвращает dict с данными пользователя или None
        """
        if not redis_client:
            return None
            
        try:
            cached_data = redis_client.get(f"user_cache:{user_id}")
            if cached_data:
                user_dict = json.loads(cached_data)
                logger.debug(f"User {user_id} found in cache")
                return user_dict
        except Exception as e:
            logger.warning(f"Error reading user {user_id} from cache: {e}")
            
        return None
    
    @staticmethod 
    def set_user(user: User, ttl: int = DEFAULT_TTL) -> bool:
        """
        ✅ Сохранить пользователя в кеш
        Возвращает True если успешно сохранен
        """
        if not redis_client or not user:
            return False
            
        try:
            # Преобразуем SQLAlchemy объект в dict для JSON сериализации
            user_dict = {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "phone": user.phone,
                "telegram_id": user.telegram_id,
                "role": user.role.value if user.role else "client",
                "is_active": user.is_active,
                "is_verified": user.is_verified,
                "bonus_points": user.bonus_points,
                "address": user.address,
                "preferences": user.preferences,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None
            }
            
            # Сохраняем в Redis с TTL
            redis_client.setex(
                f"user_cache:{user.id}", 
                ttl, 
                json.dumps(user_dict, ensure_ascii=False)
            )
            
            logger.debug(f"User {user.id} cached for {ttl} seconds")
            return True
            
        except Exception as e:
            logger.warning(f"Error caching user {user.id}: {e}")
            return False
    
    @staticmethod
    def invalidate_user(user_id: int) -> bool:
        """
        ✅ Удалить пользователя из кеша
        Используется при обновлении данных пользователя
        """
        if not redis_client:
            return False
            
        try:
            deleted = redis_client.delete(f"user_cache:{user_id}")
            if deleted:
                logger.debug(f"User {user_id} cache invalidated")
            return deleted > 0
        except Exception as e:
            logger.warning(f"Error invalidating user {user_id} cache: {e}")
            return False
    
    @staticmethod
    def invalidate_all() -> int:
        """
        ✅ Очистить весь кеш пользователей
        Возвращает количество удаленных ключей
        """
        if not redis_client:
            return 0
            
        try:
            keys = redis_client.keys("user_cache:*")
            if keys:
                deleted = redis_client.delete(*keys)
                logger.info(f"Invalidated {deleted} user cache entries")
                return deleted
        except Exception as e:
            logger.warning(f"Error invalidating all user cache: {e}")
            
        return 0
    
    @staticmethod
    def warm_cache(users: list[User]) -> int:
        """
        ✅ Предварительное заполнение кеша
        Используется при запуске приложения
        """
        if not redis_client or not users:
            return 0
            
        cached_count = 0
        for user in users:
            if UserCache.set_user(user):
                cached_count += 1
                
        logger.info(f"Warmed user cache with {cached_count} users")
        return cached_count
    
    @staticmethod
    def get_cache_stats() -> dict:
        """
        ✅ Статистика кеша пользователей
        """
        if not redis_client:
            return {"status": "disabled", "keys": 0}
            
        try:
            keys = redis_client.keys("user_cache:*")
            return {
                "status": "active",
                "keys": len(keys),
                "redis_connected": True
            }
        except Exception as e:
            return {
                "status": "error", 
                "error": str(e),
                "redis_connected": False
            } 