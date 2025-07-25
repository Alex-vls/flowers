from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class UserRole(str, enum.Enum):
    CLIENT = "client"
    ADMIN = "admin"
    COURIER = "courier"


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Nullable for OAuth users
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    telegram_id = Column(String(50), unique=True, index=True, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.CLIENT, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Profile fields
    address = Column(Text, nullable=True)
    preferences = Column(Text, nullable=True)  # JSON string for user preferences
    bonus_points = Column(Integer, default=0, nullable=False)
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="user")
    orders = relationship("Order", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    bonuses = relationship("Bonus", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>" 