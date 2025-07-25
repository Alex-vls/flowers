from typing import Optional, List
from pydantic import BaseModel, HttpUrl
from datetime import datetime
from app.models.flower import FlowerCategory


class FlowerBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: FlowerCategory
    price: float
    image_url: Optional[HttpUrl] = None
    is_seasonal: bool = False
    season_start: Optional[str] = None
    season_end: Optional[str] = None
    stock_quantity: int = 0
    min_order_quantity: int = 1
    max_order_quantity: int = 100


class FlowerCreate(FlowerBase):
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    tags: Optional[str] = None


class FlowerUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[FlowerCategory] = None
    price: Optional[float] = None
    image_url: Optional[HttpUrl] = None
    is_available: Optional[bool] = None
    is_seasonal: Optional[bool] = None
    season_start: Optional[str] = None
    season_end: Optional[str] = None
    stock_quantity: Optional[int] = None
    min_order_quantity: Optional[int] = None
    max_order_quantity: Optional[int] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    tags: Optional[str] = None


class FlowerInDB(FlowerBase):
    id: int
    is_available: bool
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    tags: Optional[str] = None
    views_count: int
    orders_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Flower(FlowerInDB):
    pass


class FlowerList(BaseModel):
    id: int
    name: str
    category: FlowerCategory
    price: float
    image_url: Optional[HttpUrl] = None
    is_available: bool
    views_count: int
    orders_count: int

    class Config:
        from_attributes = True


class FlowerFilter(BaseModel):
    category: Optional[FlowerCategory] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    available_only: bool = True
    search: Optional[str] = None
    sort_by: Optional[str] = "name"  # name, price, popularity
    sort_order: Optional[str] = "asc"  # asc, desc


class FlowerSearch(BaseModel):
    query: str
    limit: int = 10 