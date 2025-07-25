from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class BonusType(str, enum.Enum):
    ORDER_BONUS = "order_bonus"
    REFERRAL_BONUS = "referral_bonus"
    WELCOME_BONUS = "welcome_bonus"
    PROMOTION_BONUS = "promotion_bonus"


class BonusStatus(str, enum.Enum):
    ACTIVE = "active"
    USED = "used"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class Bonus(Base):
    __tablename__ = "bonuses"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Bonus details
    type = Column(Enum(BonusType), nullable=False)
    amount = Column(Integer, nullable=False)  # Bonus points
    description = Column(Text, nullable=True)
    
    # Status and expiration
    status = Column(Enum(BonusStatus), default=BonusStatus.ACTIVE, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Usage
    used_at = Column(DateTime(timezone=True), nullable=True)
    used_for_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    
    # Metadata
    bonus_metadata = Column(Text, nullable=True)  # JSON string for additional data
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="bonuses")
    used_for_order = relationship("Order")
    
    def __repr__(self):
        return f"<Bonus(id={self.id}, user_id={self.user_id}, amount={self.amount})>"


class Referral(Base):
    __tablename__ = "referrals"
    
    id = Column(Integer, primary_key=True, index=True)
    referrer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    referred_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Referral details
    referral_code = Column(String(20), nullable=False, index=True)
    bonus_paid = Column(Boolean, default=False, nullable=False)
    bonus_amount = Column(Integer, default=0, nullable=False)
    
    # Registration
    registered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    first_order_at = Column(DateTime(timezone=True), nullable=True)
    
    # Statistics
    total_orders = Column(Integer, default=0, nullable=False)
    total_spent = Column(Float, default=0.0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    referrer = relationship("User", foreign_keys=[referrer_id])
    referred = relationship("User", foreign_keys=[referred_id])
    
    def __repr__(self):
        return f"<Referral(id={self.id}, referrer_id={self.referrer_id}, referred_id={self.referred_id})>"


class GiftCertificate(Base):
    __tablename__ = "gift_certificates"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    
    # Certificate details
    amount = Column(Float, nullable=False)  # Nominal value
    bouquet_count = Column(Integer, nullable=True)  # Number of bouquets
    description = Column(Text, nullable=True)
    
    # Usage
    is_used = Column(Boolean, default=False, nullable=False)
    used_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    used_at = Column(DateTime(timezone=True), nullable=True)
    used_for_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    
    # Expiration
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Creation
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    used_by_user = relationship("User", foreign_keys=[used_by_user_id])
    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    used_for_order = relationship("Order")
    
    def __repr__(self):
        return f"<GiftCertificate(id={self.id}, code='{self.code}', amount={self.amount})>" 