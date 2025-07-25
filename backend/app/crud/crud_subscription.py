from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.subscription import Subscription

class CRUDSubscription:
    def get(self, db: Session, subscription_id: int) -> Optional[Subscription]:
        """Получить подписку по ID"""
        return db.query(Subscription).filter(Subscription.id == subscription_id).first()
    
    def get_by_user(self, db: Session, user_id: int) -> List[Subscription]:
        """Получить подписки пользователя"""
        return db.query(Subscription).filter(Subscription.user_id == user_id).all()

crud_subscription = CRUDSubscription() 