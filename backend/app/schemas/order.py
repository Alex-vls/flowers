from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from app.models.order import OrderStatus, PaymentStatus, DeliverySlot


class OrderItemBase(BaseModel):
    flower_id: int
    quantity: int
    unit_price: float
    notes: Optional[str] = None


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemInDB(OrderItemBase):
    id: int
    order_id: int
    total_price: float
    created_at: datetime

    class Config:
        from_attributes = True


class OrderItem(OrderItemInDB):
    pass


class OrderBase(BaseModel):
    delivery_address: str
    delivery_date: datetime
    delivery_slot: Optional[DeliverySlot] = None
    delivery_instructions: Optional[str] = None
    customer_notes: Optional[str] = None


class OrderCreate(OrderBase):
    items: List[OrderItemCreate]
    subscription_id: Optional[int] = None


class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    delivery_address: Optional[str] = None
    delivery_date: Optional[datetime] = None
    delivery_slot: Optional[DeliverySlot] = None
    delivery_instructions: Optional[str] = None
    admin_notes: Optional[str] = None
    tracking_number: Optional[str] = None
    estimated_delivery: Optional[datetime] = None


class OrderInDB(OrderBase):
    id: int
    order_number: str
    user_id: int
    subscription_id: Optional[int] = None
    status: OrderStatus
    payment_status: PaymentStatus
    subtotal: float
    discount_amount: float
    delivery_fee: float
    total_amount: float
    payment_method: Optional[str] = None
    payment_id: Optional[str] = None
    paid_at: Optional[datetime] = None
    tracking_number: Optional[str] = None
    estimated_delivery: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Order(OrderInDB):
    items: List[OrderItem] = []


class OrderList(BaseModel):
    id: int
    order_number: str
    status: OrderStatus
    payment_status: PaymentStatus
    total_amount: float
    delivery_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    admin_notes: Optional[str] = None


class OrderFilter(BaseModel):
    status: Optional[OrderStatus] = None
    payment_status: Optional[PaymentStatus] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    user_id: Optional[int] = None 