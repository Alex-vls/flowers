from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from app.models.subscription import SubscriptionFrequency, SubscriptionStatus
from app.models.order import DeliverySlot


class SubscriptionBase(BaseModel):
    name: str
    description: Optional[str] = None
    frequency: SubscriptionFrequency
    custom_days: Optional[str] = None  # JSON string
    quantity_per_delivery: int = 1
    price_per_delivery: float
    delivery_address: str
    delivery_time_slot: Optional[DeliverySlot] = None
    delivery_instructions: Optional[str] = None
    auto_renew: bool = True
    max_renewals: Optional[int] = None


class SubscriptionCreate(SubscriptionBase):
    start_date: datetime


class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[SubscriptionFrequency] = None
    custom_days: Optional[str] = None
    quantity_per_delivery: Optional[int] = None
    price_per_delivery: Optional[float] = None
    delivery_address: Optional[str] = None
    delivery_time_slot: Optional[DeliverySlot] = None
    delivery_instructions: Optional[str] = None
    auto_renew: Optional[bool] = None
    max_renewals: Optional[int] = None
    status: Optional[SubscriptionStatus] = None


class SubscriptionInDB(SubscriptionBase):
    id: int
    user_id: int
    total_price: float
    discount_percentage: float
    status: SubscriptionStatus
    start_date: datetime
    end_date: Optional[datetime] = None
    next_delivery_date: datetime
    current_renewal_count: int
    total_deliveries: int
    completed_deliveries: int
    skipped_deliveries: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Subscription(SubscriptionInDB):
    pass


class SubscriptionList(BaseModel):
    id: int
    name: str
    frequency: SubscriptionFrequency
    status: SubscriptionStatus
    next_delivery_date: datetime
    total_deliveries: int
    completed_deliveries: int

    class Config:
        from_attributes = True


class SubscriptionPause(BaseModel):
    pause_until: datetime
    reason: Optional[str] = None


class SubscriptionResume(BaseModel):
    resume_date: datetime


class SubscriptionSkip(BaseModel):
    skip_date: datetime
    reason: Optional[str] = None 