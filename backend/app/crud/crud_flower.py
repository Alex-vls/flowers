from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.flower import Flower, FlowerCategory

class CRUDFlower:
    def get(self, db: Session, flower_id: int) -> Optional[Flower]:
        """Получить цветок по ID"""
        return db.query(Flower).filter(Flower.id == flower_id).first()
    
    def get_by_category(self, db: Session, category: str, limit: int = 10) -> List[Flower]:
        """Получить цветы по категории"""
        # Попробовать найти категорию в enum, иначе использовать как есть
        try:
            category_enum = FlowerCategory(category)
            return db.query(Flower).filter(Flower.category == category_enum).limit(limit).all()
        except ValueError:
            # Если категория не найдена в enum, ищем по строке
            return db.query(Flower).filter(Flower.category == category).limit(limit).all()
    
    def get_all(self, db: Session, skip: int = 0, limit: int = 10) -> List[Flower]:
        """Получить все цветы"""
        return db.query(Flower).offset(skip).limit(limit).all()

crud_flower = CRUDFlower() 