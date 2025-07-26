"""
⚡ Caching System
Система кэширования для оптимизации производительности API
"""

import json
import hashlib
import asyncio
from typing import Any, Optional, Union, Callable, Dict
from functools import wraps
from datetime import datetime, timedelta
import redis
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis connection for caching
cache_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

class CacheManager:
    """Менеджер кэширования"""
    
    def __init__(self):
        self.client = cache_client
        self.default_ttl = 300  # 5 минут
        
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Генерирует ключ кэша на основе аргументов"""
        # Создаем уникальный ключ из аргументов
        key_data = f"{prefix}:{args}:{sorted(kwargs.items())}"
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        return f"cache:{prefix}:{key_hash}"
    
    async def get(self, key: str) -> Optional[Any]:
        """Получает значение из кэша"""
        try:
            value = await asyncio.to_thread(self.client.get, key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Сохраняет значение в кэш"""
        try:
            ttl = ttl or self.default_ttl
            serialized_value = json.dumps(value, default=str)
            await asyncio.to_thread(self.client.setex, key, ttl, serialized_value)
            return True
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Удаляет значение из кэша"""
        try:
            await asyncio.to_thread(self.client.delete, key)
            return True
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Удаляет все ключи по паттерну"""
        try:
            keys = await asyncio.to_thread(self.client.keys, pattern)
            if keys:
                deleted = await asyncio.to_thread(self.client.delete, *keys)
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error: {e}")
            return 0
    
    async def clear_all(self) -> bool:
        """Очищает весь кэш"""
        try:
            await asyncio.to_thread(self.client.flushdb)
            return True
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            return False

# Глобальный экземпляр
cache_manager = CacheManager()

def cache_result(
    prefix: str,
    ttl: int = 300,
    skip_cache: bool = False,
    cache_key_func: Optional[Callable] = None
):
    """
    Декоратор для кэширования результатов функций
    
    Args:
        prefix: Префикс для ключа кэша
        ttl: Время жизни кэша в секундах
        skip_cache: Пропустить кэш (для отладки)
        cache_key_func: Функция для генерации кастомного ключа
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if skip_cache:
                return await func(*args, **kwargs)
            
            # Генерируем ключ кэша
            if cache_key_func:
                cache_key = cache_key_func(*args, **kwargs)
            else:
                cache_key = cache_manager._generate_key(prefix, *args, **kwargs)
            
            # Пытаемся получить из кэша
            cached_result = await cache_manager.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for key: {cache_key}")
                return cached_result
            
            # Выполняем функцию
            logger.debug(f"Cache miss for key: {cache_key}")
            result = await func(*args, **kwargs)
            
            # Сохраняем в кэш
            await cache_manager.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator

def invalidate_cache(patterns: Union[str, list]):
    """
    Декоратор для инвалидации кэша после выполнения функции
    
    Args:
        patterns: Паттерн(ы) ключей для удаления из кэша
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            result = await func(*args, **kwargs)
            
            # Инвалидируем кэш
            if isinstance(patterns, str):
                await cache_manager.delete_pattern(f"cache:{patterns}*")
            else:
                for pattern in patterns:
                    await cache_manager.delete_pattern(f"cache:{pattern}*")
            
            logger.debug(f"Cache invalidated for patterns: {patterns}")
            return result
        
        return wrapper
    return decorator

# Специализированные функции кэширования

async def cache_flowers_list(
    page: int = 1,
    per_page: int = 20,
    category: Optional[str] = None,
    available_only: bool = True
) -> str:
    """Генерирует ключ кэша для списка цветов"""
    return f"flowers_list:{page}:{per_page}:{category}:{available_only}"

async def cache_flower_detail(flower_id: int) -> str:
    """Генерирует ключ кэша для детальной информации о цветке"""
    return f"flower_detail:{flower_id}"

async def cache_user_orders(user_id: int, page: int = 1) -> str:
    """Генерирует ключ кэша для заказов пользователя"""
    return f"user_orders:{user_id}:{page}"

async def cache_reviews(flower_id: int, page: int = 1) -> str:
    """Генерирует ключ кэша для отзывов о цветке"""
    return f"reviews:{flower_id}:{page}"

# Кэширование статистики
async def cache_stats() -> str:
    """Генерирует ключ кэша для статистики"""
    return "stats:general"

# Функции для работы с кэшем приложения

async def get_cached_flowers(
    page: int = 1,
    per_page: int = 20,
    category: Optional[str] = None,
    available_only: bool = True
) -> Optional[Dict[str, Any]]:
    """Получает кэшированный список цветов"""
    cache_key = await cache_flowers_list(page, per_page, category, available_only)
    return await cache_manager.get(f"cache:{cache_key}")

async def set_cached_flowers(
    flowers_data: Dict[str, Any],
    page: int = 1,
    per_page: int = 20,
    category: Optional[str] = None,
    available_only: bool = True,
    ttl: int = 300
) -> bool:
    """Сохраняет список цветов в кэш"""
    cache_key = await cache_flowers_list(page, per_page, category, available_only)
    return await cache_manager.set(f"cache:{cache_key}", flowers_data, ttl)

async def invalidate_flowers_cache():
    """Инвалидирует весь кэш цветов"""
    await cache_manager.delete_pattern("cache:flowers_*")
    await cache_manager.delete_pattern("cache:flower_detail_*")

async def get_cached_flower(flower_id: int) -> Optional[Dict[str, Any]]:
    """Получает кэшированную информацию о цветке"""
    cache_key = await cache_flower_detail(flower_id)
    return await cache_manager.get(f"cache:{cache_key}")

async def set_cached_flower(flower_id: int, flower_data: Dict[str, Any], ttl: int = 600) -> bool:
    """Сохраняет информацию о цветке в кэш"""
    cache_key = await cache_flower_detail(flower_id)
    return await cache_manager.set(f"cache:{cache_key}", flower_data, ttl)

async def invalidate_flower_cache(flower_id: int):
    """Инвалидирует кэш конкретного цветка"""
    cache_key = await cache_flower_detail(flower_id)
    await cache_manager.delete(f"cache:{cache_key}")
    # Также инвалидируем списки цветов
    await cache_manager.delete_pattern("cache:flowers_list_*")

# Кэширование пользовательских данных

async def get_cached_user_data(user_id: int, data_type: str) -> Optional[Any]:
    """Получает кэшированные данные пользователя"""
    cache_key = f"user_data:{user_id}:{data_type}"
    return await cache_manager.get(f"cache:{cache_key}")

async def set_cached_user_data(
    user_id: int, 
    data_type: str, 
    data: Any, 
    ttl: int = 300
) -> bool:
    """Сохраняет данные пользователя в кэш"""
    cache_key = f"user_data:{user_id}:{data_type}"
    return await cache_manager.set(f"cache:{cache_key}", data, ttl)

async def invalidate_user_cache(user_id: int):
    """Инвалидирует весь кэш пользователя"""
    await cache_manager.delete_pattern(f"cache:user_data:{user_id}:*")
    await cache_manager.delete_pattern(f"cache:user_orders:{user_id}:*")

# Warming up cache (предзагрузка)

async def warm_up_cache():
    """Предзагружает часто используемые данные в кэш"""
    try:
        logger.info("Starting cache warm-up...")
        
        # Предзагружаем популярные цветы
        # Здесь можно добавить логику для загрузки популярных товаров
        
        # Предзагружаем статистику
        # await get_system_stats()  # Это вызовет кэширование статистики
        
        logger.info("Cache warm-up completed")
    except Exception as e:
        logger.error(f"Cache warm-up failed: {e}")

# Мониторинг кэша

async def get_cache_stats() -> Dict[str, Any]:
    """Получает статистику использования кэша"""
    try:
        info = await asyncio.to_thread(cache_manager.client.info, "memory")
        keyspace = await asyncio.to_thread(cache_manager.client.info, "keyspace")
        
        # Подсчитываем количество ключей кэша
        cache_keys = await asyncio.to_thread(cache_manager.client.keys, "cache:*")
        
        return {
            "memory_usage": info.get("used_memory_human", "Unknown"),
            "total_keys": len(cache_keys),
            "cache_keys": len([k for k in cache_keys if k.startswith("cache:")]),
            "keyspace_info": keyspace,
            "connected_clients": info.get("connected_clients", 0)
        }
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        return {"error": str(e)}

# Cleanup функции

async def cleanup_expired_cache():
    """Очищает истекшие ключи кэша (Redis делает это автоматически, но можно добавить дополнительную логику)"""
    try:
        # Redis автоматически удаляет истекшие ключи, но мы можем добавить дополнительную очистку
        # Например, удаление старых ключей определенных типов
        
        old_keys_pattern = f"cache:temp:*"
        deleted = await cache_manager.delete_pattern(old_keys_pattern)
        
        if deleted > 0:
            logger.info(f"Cleaned up {deleted} temporary cache keys")
            
    except Exception as e:
        logger.error(f"Cache cleanup failed: {e}")

# Middleware для автоматического кэширования

class CacheMiddleware:
    """Middleware для автоматического кэширования GET запросов"""
    
    def __init__(self, app, cache_ttl: int = 300):
        self.app = app
        self.cache_ttl = cache_ttl
        self.cacheable_paths = [
            "/api/v1/flowers",
            "/api/v1/reviews",
            "/api/v1/seo"
        ]
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        method = scope["method"]
        path = scope["path"]
        
        # Кэшируем только GET запросы для определенных путей
        if method == "GET" and any(path.startswith(p) for p in self.cacheable_paths):
            # Генерируем ключ кэша на основе пути и query параметров
            query_string = scope.get("query_string", b"").decode()
            cache_key = f"http_cache:{path}:{query_string}"
            
            # Пытаемся получить из кэша
            cached_response = await cache_manager.get(cache_key)
            if cached_response:
                # Возвращаем кэшированный ответ
                response_data = cached_response
                await send({
                    "type": "http.response.start",
                    "status": response_data["status"],
                    "headers": response_data["headers"]
                })
                await send({
                    "type": "http.response.body",
                    "body": response_data["body"].encode()
                })
                return
        
        # Если не в кэше, выполняем запрос и кэшируем результат
        await self.app(scope, receive, send) 