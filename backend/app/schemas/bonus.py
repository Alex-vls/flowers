from typing import Optional
from pydantic import BaseModel
from datetime import datetime
from app.models.bonus import BonusType, BonusStatus


class BonusBase(BaseModel):
    type: BonusType
    amount: int
    description: Optional[str] = None
    expires_at: Optional[datetime] = None


class BonusCreate(BonusBase):
    user_id: int


class BonusUpdate(BaseModel):
    status: Optional[BonusStatus] = None
    expires_at: Optional[datetime] = None


class BonusInDB(BonusBase):
    id: int
    user_id: int
    status: BonusStatus
    used_at: Optional[datetime] = None
    used_for_order_id: Optional[int] = None
    metadata: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Bonus(BonusInDB):
    pass


class BonusList(BaseModel):
    id: int
    type: BonusType
    amount: int
    status: BonusStatus
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReferralBase(BaseModel):
    referral_code: str


class ReferralCreate(ReferralBase):
    referrer_id: int


class ReferralInDB(ReferralBase):
    id: int
    referrer_id: int
    referred_id: Optional[int] = None
    bonus_paid: bool
    bonus_amount: int
    registered_at: Optional[datetime] = None
    first_order_at: Optional[datetime] = None
    total_orders: int
    total_spent: float
    created_at: datetime

    class Config:
        from_attributes = True


class Referral(ReferralInDB):
    pass


class ReferralList(BaseModel):
    id: int
    referral_code: str
    referred_id: Optional[int] = None
    total_orders: int
    total_spent: float
    created_at: datetime

    class Config:
        from_attributes = True


class GiftCertificateBase(BaseModel):
    amount: float
    bouquet_count: Optional[int] = None
    description: Optional[str] = None
    expires_at: Optional[datetime] = None


class GiftCertificateCreate(GiftCertificateBase):
    pass


class GiftCertificateInDB(GiftCertificateBase):
    id: int
    code: str
    is_used: bool
    used_by_user_id: Optional[int] = None
    used_at: Optional[datetime] = None
    used_for_order_id: Optional[int] = None
    created_by_user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GiftCertificate(GiftCertificateInDB):
    pass


class GiftCertificateList(BaseModel):
    id: int
    code: str
    amount: float
    is_used: bool
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True 