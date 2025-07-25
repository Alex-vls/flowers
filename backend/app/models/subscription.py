from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


class SubscriptionFrequency(str, enum.Enum):
    DAILY = "daily"
    EVERY_OTHER_DAY = "every_other_day"
    WEEKLY = "weekly"
    CUSTOM = "custom"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Subscription settings
    frequency = Column(Enum(SubscriptionFrequency), nullable=False)
    custom_days = Column(Text, nullable=True)  # JSON string for custom days [1,3,5]
    quantity_per_delivery = Column(Integer, default=1, nullable=False)
    
    # Pricing
    price_per_delivery = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    discount_percentage = Column(Float, default=0.0, nullable=False)
    
    # Status and dates
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    next_delivery_date = Column(DateTime(timezone=True), nullable=False)
    
    # Delivery preferences
    delivery_address = Column(Text, nullable=False)
    delivery_time_slot = Column(String(20), nullable=True)  # morning, afternoon, evening
    delivery_instructions = Column(Text, nullable=True)
    
    # Auto-renewal
    auto_renew = Column(Boolean, default=True, nullable=False)
    max_renewals = Column(Integer, nullable=True)  # None for unlimited
    current_renewal_count = Column(Integer, default=0, nullable=False)
    
    # Statistics
    total_deliveries = Column(Integer, default=0, nullable=False)
    completed_deliveries = Column(Integer, default=0, nullable=False)
    skipped_deliveries = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")
    orders = relationship("Order", back_populates="subscription")
    
    def __repr__(self):
        return f"<Subscription(id={self.id}, user_id={self.user_id}, status='{self.status}')>" 