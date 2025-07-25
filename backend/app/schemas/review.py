from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class ReviewBase(BaseModel):
    order_id: int
    flower_id: Optional[int] = None
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = None
    content: str = Field(..., min_length=10, max_length=1000)


class ReviewCreate(ReviewBase):
    pass


class ReviewUpdate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = None
    content: Optional[str] = Field(None, min_length=10, max_length=1000)


class ReviewInDB(ReviewBase):
    id: int
    user_id: int
    is_approved: bool
    is_flagged: bool
    flagged_reason: Optional[str] = None
    moderated_by: Optional[int] = None
    moderated_at: Optional[datetime] = None
    admin_notes: Optional[str] = None
    helpful_votes: int
    total_votes: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Review(ReviewInDB):
    pass


class ReviewList(BaseModel):
    id: int
    user_id: int
    order_id: int
    flower_id: Optional[int] = None
    rating: int
    title: Optional[str] = None
    content: str
    is_approved: bool
    helpful_votes: int
    total_votes: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewVote(BaseModel):
    helpful: bool 