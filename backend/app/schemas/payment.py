from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from app.models.payment import PaymentMethod, PaymentStatus


class PaymentBase(BaseModel):
    amount: float
    currency: str = "RUB"
    method: PaymentMethod
    description: Optional[str] = None


class PaymentCreate(PaymentBase):
    order_id: int


class PaymentUpdate(BaseModel):
    status: Optional[PaymentStatus] = None
    external_payment_id: Optional[str] = None
    external_transaction_id: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None


class PaymentInDB(PaymentBase):
    id: int
    order_id: int
    user_id: int
    status: PaymentStatus
    external_payment_id: Optional[str] = None
    external_transaction_id: Optional[str] = None
    metadata: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    refunded_at: Optional[datetime] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


class Payment(PaymentInDB):
    pass


class PaymentList(BaseModel):
    id: int
    order_id: int
    amount: float
    method: PaymentMethod
    status: PaymentStatus
    created_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaymentRefund(BaseModel):
    amount: Optional[float] = None
    reason: Optional[str] = None 