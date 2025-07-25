from sqlalchemy.orm import Session
from typing import Optional
from app.models.user import User

class CRUDUser:
    def get(self, db: Session, user_id: int) -> Optional[User]:
        """Получить пользователя по ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    def get_by_email(self, db: Session, email: str) -> Optional[User]:
        """Получить пользователя по email"""
        return db.query(User).filter(User.email == email).first()
    
    def get_by_telegram_id(self, db: Session, telegram_id: str) -> Optional[User]:
        """Получить пользователя по Telegram ID"""
        return db.query(User).filter(User.telegram_id == telegram_id).first()

crud_user = CRUDUser() 