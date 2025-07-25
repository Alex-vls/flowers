from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from app.models.notification import NotificationType, NotificationChannel, NotificationStatus


class NotificationBase(BaseModel):
    type: NotificationType
    channel: NotificationChannel
    title: str
    content: str
    metadata: Optional[str] = None


class NotificationCreate(NotificationBase):
    user_id: int


class NotificationUpdate(BaseModel):
    status: Optional[NotificationStatus] = None
    external_id: Optional[str] = None
    error_message: Optional[str] = None


class NotificationInDB(NotificationBase):
    id: int
    user_id: int
    status: NotificationStatus
    external_id: Optional[str] = None
    order_id: Optional[int] = None
    subscription_id: Optional[int] = None
    error_message: Optional[str] = None
    retry_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Notification(NotificationInDB):
    pass


class NotificationList(BaseModel):
    id: int
    type: NotificationType
    channel: NotificationChannel
    title: str
    status: NotificationStatus
    created_at: datetime
    sent_at: Optional[datetime] = None
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationSend(BaseModel):
    user_id: int
    type: NotificationType
    channel: NotificationChannel
    title: str
    content: str
    metadata: Optional[str] = None


class NotificationBroadcast(BaseModel):
    type: NotificationType
    channel: NotificationChannel
    title: str
    content: str
    metadata: Optional[str] = None 