from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.order import Order

class CRUDOrder:
    def get(self, db: Session, order_id: int) -> Optional[Order]:
        """Получить заказ по ID"""
        return db.query(Order).filter(Order.id == order_id).first()
    
    def get_by_user(self, db: Session, user_id: int, limit: int = 10) -> List[Order]:
        """Получить заказы пользователя"""
        return db.query(Order).filter(Order.user_id == user_id).limit(limit).all()

crud_order = CRUDOrder() 