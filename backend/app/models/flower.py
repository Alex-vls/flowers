from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, Enum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class FlowerCategory(str, enum.Enum):
    ROSES = "roses"
    TULIPS = "tulips"
    LILIES = "lilies"
    ORCHIDS = "orchids"
    SUNFLOWERS = "sunflowers"
    DAISIES = "daisies"
    CARNATIONS = "carnations"
    OTHER = "other"


class Flower(Base):
    __tablename__ = "flowers"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(Enum(FlowerCategory), nullable=False, index=True)
    price = Column(Float, nullable=False)
    image_url = Column(String(500), nullable=True)  # External URL for now
    is_available = Column(Boolean, default=True, nullable=False, index=True)
    is_seasonal = Column(Boolean, default=False, nullable=False)
    season_start = Column(String(10), nullable=True)  # MM-DD format
    season_end = Column(String(10), nullable=True)    # MM-DD format
    stock_quantity = Column(Integer, default=0, nullable=False)
    min_order_quantity = Column(Integer, default=1, nullable=False)
    max_order_quantity = Column(Integer, default=100, nullable=False)
    
    # SEO and metadata
    meta_title = Column(String(255), nullable=True)
    meta_description = Column(Text, nullable=True)
    tags = Column(Text, nullable=True)  # JSON string for tags
    
    # Statistics
    views_count = Column(Integer, default=0, nullable=False)
    orders_count = Column(Integer, default=0, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    def __repr__(self):
        return f"<Flower(id={self.id}, name='{self.name}', price={self.price})>" 