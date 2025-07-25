from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, flowers, subscriptions, orders, payments, bonuses, reviews, notifications, seo

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(flowers.router, prefix="/flowers", tags=["flowers"])
api_router.include_router(subscriptions.router, prefix="/subscriptions", tags=["subscriptions"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(bonuses.router, prefix="/bonuses", tags=["bonuses"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(seo.router, tags=["seo"]) 