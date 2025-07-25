import redis.asyncio as redis
from app.core.config import settings


class RedisManager:
    def __init__(self):
        self.redis_client = None
    
    async def connect(self):
        """Connect to Redis"""
        self.redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
        await self.redis_client.ping()
    
    async def disconnect(self):
        """Disconnect from Redis"""
        if self.redis_client:
            await self.redis_client.close()
    
    async def get(self, key: str):
        """Get value from cache"""
        if self.redis_client:
            return await self.redis_client.get(key)
        return None
    
    async def set(self, key: str, value: str, expire: int = None):
        """Set value in cache"""
        if self.redis_client:
            await self.redis_client.set(key, value, ex=expire)
    
    async def delete(self, key: str):
        """Delete key from cache"""
        if self.redis_client:
            await self.redis_client.delete(key)
    
    async def exists(self, key: str) -> bool:
        """Check if key exists"""
        if self.redis_client:
            return await self.redis_client.exists(key) > 0
        return False


redis_manager = RedisManager() 