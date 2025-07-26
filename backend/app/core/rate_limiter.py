"""
🛡️ Rate Limiting System
Защита API от DDoS и злоупотреблений с использованием Redis
"""

import time
import hashlib
from typing import Optional, Dict, Any
from functools import wraps
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import redis
import logging
import asyncio
import inspect

from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis connection
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)

class RateLimitExceeded(HTTPException):
    """Custom exception for rate limit exceeded"""
    def __init__(self, retry_after: int):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )

class RateLimiter:
    """
    Sliding Window Rate Limiter using Redis
    """
    
    def __init__(
        self,
        requests: int,
        window: int,  # seconds
        per: str = "ip",  # "ip", "user", "endpoint"
        key_func: Optional[callable] = None
    ):
        self.requests = requests
        self.window = window
        self.per = per
        self.key_func = key_func

    def get_identifier(self, request: Request, user_id: Optional[int] = None) -> str:
        """Get unique identifier for rate limiting"""
        if self.key_func:
            return self.key_func(request, user_id)
        
        if self.per == "ip":
            # Get real IP considering proxies
            ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            if not ip:
                ip = request.headers.get("X-Real-IP", "")
            if not ip:
                ip = request.client.host if request.client else "unknown"
            return f"ip:{ip}"
        
        elif self.per == "user" and user_id:
            return f"user:{user_id}"
        
        elif self.per == "endpoint":
            endpoint = f"{request.method}:{request.url.path}"
            ip = request.client.host if request.client else "unknown"
            return f"endpoint:{endpoint}:{ip}"
        
        # Fallback to IP
        ip = request.client.host if request.client else "unknown"
        return f"fallback:{ip}"

    async def is_allowed(self, request: Request, user_id: Optional[int] = None) -> tuple[bool, Dict[str, Any]]:
        """
        Check if request is allowed using sliding window algorithm
        Returns: (is_allowed, info_dict)
        """
        try:
            identifier = self.get_identifier(request, user_id)
            key = f"rate_limit:{identifier}"
            
            current_time = int(time.time())
            window_start = current_time - self.window
            
            # Use Redis pipeline for atomic operations
            pipe = redis_client.pipeline()
            
            # Remove old entries
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current requests in window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            
            # Set expiration
            pipe.expire(key, self.window + 1)
            
            results = pipe.execute()
            current_requests = results[1]
            
            # Check if limit exceeded
            if current_requests >= self.requests:
                # Get oldest request time to calculate retry_after
                oldest_requests = redis_client.zrange(key, 0, 0, withscores=True)
                if oldest_requests:
                    oldest_time = int(oldest_requests[0][1])
                    retry_after = max(1, oldest_time + self.window - current_time)
                else:
                    retry_after = self.window
                
                return False, {
                    "requests_made": current_requests,
                    "requests_limit": self.requests,
                    "window_seconds": self.window,
                    "retry_after": retry_after,
                    "identifier": identifier
                }
            
            return True, {
                "requests_made": current_requests + 1,
                "requests_limit": self.requests,
                "window_seconds": self.window,
                "requests_remaining": self.requests - current_requests - 1,
                "identifier": identifier
            }
            
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # Fail open - allow request if Redis is down
            return True, {"error": "Rate limiter unavailable"}

# Predefined rate limiters
RATE_LIMITS = {
    # General API limits
    "api_general": RateLimiter(requests=100, window=60, per="ip"),  # 100 req/min per IP
    "api_strict": RateLimiter(requests=20, window=60, per="ip"),    # 20 req/min per IP
    
    # Authentication limits
    "auth_login": RateLimiter(requests=5, window=300, per="ip"),    # 5 attempts per 5 min
    "auth_register": RateLimiter(requests=3, window=3600, per="ip"), # 3 registrations per hour
    
    # User-specific limits
    "user_actions": RateLimiter(requests=200, window=3600, per="user"), # 200 req/hour per user
    "user_orders": RateLimiter(requests=10, window=3600, per="user"),   # 10 orders per hour
    
    # Admin limits (more lenient)
    "admin_actions": RateLimiter(requests=1000, window=3600, per="user"), # 1000 req/hour for admins
}

def rate_limit(limit_name: str = "api_general"):
    """
    Decorator for rate limiting endpoints
    
    Usage:
    @rate_limit("auth_login")
    async def login_endpoint(...):
        ...
    
    Also supports sync functions:
    @rate_limit("auth_login") 
    def sync_endpoint(...):
        ...
    """
    def decorator(func):
        # Check if function is async or sync
        is_async = inspect.iscoroutinefunction(func)
        
        if is_async:
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                # Extract request and user from function arguments
                request = None
                user_id = None
                
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
                
                # Try to get user from kwargs
                if "current_user" in kwargs and kwargs["current_user"]:
                    user_id = kwargs["current_user"].id
                
                if not request:
                    logger.warning("Rate limiter: Request object not found")
                    return await func(*args, **kwargs)
                
                limiter = RATE_LIMITS.get(limit_name)
                if not limiter:
                    logger.warning(f"Rate limiter '{limit_name}' not found")
                    return await func(*args, **kwargs)
                
                is_allowed, info = await limiter.is_allowed(request, user_id)
                
                if not is_allowed:
                    logger.warning(
                        f"Rate limit exceeded for {info.get('identifier', 'unknown')} "
                        f"on {request.method} {request.url.path}"
                    )
                    raise RateLimitExceeded(retry_after=info.get("retry_after", 60))
                
                # Call the original async function
                response = await func(*args, **kwargs)
                
                # Add rate limit headers to response
                if hasattr(response, "headers"):
                    response.headers["X-RateLimit-Limit"] = str(info.get("requests_limit", "unknown"))
                    response.headers["X-RateLimit-Remaining"] = str(info.get("requests_remaining", "unknown"))
                    response.headers["X-RateLimit-Reset"] = str(info.get("reset_time", "unknown"))
                
                return response
            
            return async_wrapper
            
        else:
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                # Extract request and user from function arguments
                request = None
                user_id = None
                
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
                
                # Try to get user from kwargs
                if "current_user" in kwargs and kwargs["current_user"]:
                    user_id = kwargs["current_user"].id
                
                if not request:
                    logger.warning("Rate limiter: Request object not found")
                    return func(*args, **kwargs)
                
                limiter = RATE_LIMITS.get(limit_name)
                if not limiter:
                    logger.warning(f"Rate limiter '{limit_name}' not found")
                    return func(*args, **kwargs)
                
                # Run async rate limiting in sync context
                loop = None
                try:
                    loop = asyncio.get_event_loop()
                except RuntimeError:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                
                is_allowed, info = loop.run_until_complete(limiter.is_allowed(request, user_id))
                
                if not is_allowed:
                    logger.warning(
                        f"Rate limit exceeded for {info.get('identifier', 'unknown')} "
                        f"on {request.method} {request.url.path}"
                    )
                    raise RateLimitExceeded(retry_after=info.get("retry_after", 60))
                
                # Call the original sync function
                response = func(*args, **kwargs)
                
                # Add rate limit headers to response
                if hasattr(response, "headers"):
                    response.headers["X-RateLimit-Limit"] = str(info.get("requests_limit", "unknown"))
                    response.headers["X-RateLimit-Remaining"] = str(info.get("requests_remaining", "unknown"))
                    response.headers["X-RateLimit-Reset"] = str(info.get("reset_time", "unknown"))
                
                return response
            
            return sync_wrapper
    
    return decorator

async def check_rate_limit(request: Request, limit_name: str = "api_general", user_id: Optional[int] = None):
    """
    Manual rate limit check (for use in dependencies)
    """
    limiter = RATE_LIMITS.get(limit_name)
    if not limiter:
        return
    
    is_allowed, info = await limiter.is_allowed(request, user_id)
    
    if not is_allowed:
        logger.warning(
            f"Rate limit exceeded for {info.get('identifier', 'unknown')} "
            f"on {request.method} {request.url.path}"
        )
        raise RateLimitExceeded(retry_after=info.get("retry_after", 60))

# Middleware for global rate limiting
class RateLimitMiddleware:
    """
    Global rate limiting middleware
    """
    
    def __init__(self, app, default_limit: str = "api_general"):
        self.app = app
        self.default_limit = default_limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)
        
        # Skip rate limiting for health checks and static files
        if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"] or \
           request.url.path.startswith("/static"):
            await self.app(scope, receive, send)
            return

        try:
            await check_rate_limit(request, self.default_limit)
        except RateLimitExceeded as e:
            response = JSONResponse(
                status_code=e.status_code,
                content={"detail": e.detail},
                headers=e.headers
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)

# Utility functions
def get_rate_limit_status(identifier: str, limit_name: str = "api_general") -> Dict[str, Any]:
    """Get current rate limit status for an identifier"""
    limiter = RATE_LIMITS.get(limit_name)
    if not limiter:
        return {"error": "Rate limiter not found"}
    
    try:
        key = f"rate_limit:{identifier}"
        current_time = int(time.time())
        window_start = current_time - limiter.window
        
        # Count requests in current window
        current_requests = redis_client.zcount(key, window_start, current_time)
        
        return {
            "requests_made": current_requests,
            "requests_limit": limiter.requests,
            "requests_remaining": max(0, limiter.requests - current_requests),
            "window_seconds": limiter.window,
            "identifier": identifier
        }
    except Exception as e:
        logger.error(f"Error getting rate limit status: {e}")
        return {"error": "Unable to get status"}

def clear_rate_limit(identifier: str, limit_name: str = "api_general") -> bool:
    """Clear rate limit for specific identifier (admin function)"""
    try:
        key = f"rate_limit:{identifier}"
        redis_client.delete(key)
        logger.info(f"Cleared rate limit for {identifier} ({limit_name})")
        return True
    except Exception as e:
        logger.error(f"Error clearing rate limit: {e}")
        return False 