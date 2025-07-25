from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.core.database import get_db
from app.api.v1.deps import get_current_active_user, get_current_admin_user
from app.models.flower import Flower, FlowerCategory
from app.models.user import User
from app.schemas.flower import (
    FlowerCreate,
    FlowerUpdate,
    Flower as FlowerSchema,
    FlowerList,
    FlowerFilter,
    FlowerSearch
)

router = APIRouter()


@router.get("/", response_model=List[FlowerList])
def get_flowers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    category: FlowerCategory = None,
    min_price: float = None,
    max_price: float = None,
    available_only: bool = True,
    search: str = None,
    sort_by: str = "name",
    sort_order: str = "asc",
    db: Session = Depends(get_db)
) -> Any:
    """Get flowers list with filtering and search"""
    query = db.query(Flower)
    
    # Apply filters
    if category:
        query = query.filter(Flower.category == category)
    
    if min_price is not None:
        query = query.filter(Flower.price >= min_price)
    
    if max_price is not None:
        query = query.filter(Flower.price <= max_price)
    
    if available_only:
        query = query.filter(Flower.is_available == True)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Flower.name.ilike(search_term),
                Flower.description.ilike(search_term)
            )
        )
    
    # Apply sorting
    if sort_by == "price":
        if sort_order == "desc":
            query = query.order_by(Flower.price.desc())
        else:
            query = query.order_by(Flower.price.asc())
    elif sort_by == "popularity":
        if sort_order == "desc":
            query = query.order_by(Flower.orders_count.desc())
        else:
            query = query.order_by(Flower.orders_count.asc())
    else:  # name
        if sort_order == "desc":
            query = query.order_by(Flower.name.desc())
        else:
            query = query.order_by(Flower.name.asc())
    
    flowers = query.offset(skip).limit(limit).all()
    return flowers


@router.get("/search", response_model=List[FlowerList])
def search_flowers(
    search_data: FlowerSearch,
    db: Session = Depends(get_db)
) -> Any:
    """Search flowers by name and description"""
    search_term = f"%{search_data.query}%"
    flowers = db.query(Flower).filter(
        or_(
            Flower.name.ilike(search_term),
            Flower.description.ilike(search_term)
        )
    ).limit(search_data.limit).all()
    
    return flowers


@router.get("/{flower_id}", response_model=FlowerSchema)
def get_flower(
    flower_id: int,
    db: Session = Depends(get_db)
) -> Any:
    """Get flower by ID"""
    flower = db.query(Flower).filter(Flower.id == flower_id).first()
    if not flower:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flower not found"
        )
    
    # Increment view count
    flower.views_count += 1
    db.commit()
    
    return flower


@router.post("/", response_model=FlowerSchema)
def create_flower(
    flower_in: FlowerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Create new flower - admin only"""
    flower = Flower(**flower_in.dict())
    db.add(flower)
    db.commit()
    db.refresh(flower)
    return flower


@router.put("/{flower_id}", response_model=FlowerSchema)
def update_flower(
    flower_id: int,
    flower_update: FlowerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Update flower - admin only"""
    flower = db.query(Flower).filter(Flower.id == flower_id).first()
    if not flower:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flower not found"
        )
    
    for field, value in flower_update.dict(exclude_unset=True).items():
        setattr(flower, field, value)
    
    db.commit()
    db.refresh(flower)
    return flower


@router.delete("/{flower_id}")
def delete_flower(
    flower_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Delete flower - admin only"""
    flower = db.query(Flower).filter(Flower.id == flower_id).first()
    if not flower:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flower not found"
        )
    
    db.delete(flower)
    db.commit()
    
    return {"message": "Flower deleted"}


@router.get("/categories/list")
def get_categories() -> Any:
    """Get all flower categories"""
    return [category.value for category in FlowerCategory]


@router.get("/popular", response_model=List[FlowerList])
def get_popular_flowers(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
) -> Any:
    """Get most popular flowers"""
    flowers = db.query(Flower).filter(
        Flower.is_available == True
    ).order_by(Flower.orders_count.desc()).limit(limit).all()
    
    return flowers


@router.get("/seasonal", response_model=List[FlowerList])
def get_seasonal_flowers(
    db: Session = Depends(get_db)
) -> Any:
    """Get seasonal flowers"""
    from datetime import datetime
    
    current_date = datetime.now().strftime("%m-%d")
    flowers = db.query(Flower).filter(
        and_(
            Flower.is_seasonal == True,
            Flower.is_available == True,
            Flower.season_start <= current_date,
            Flower.season_end >= current_date
        )
    ).all()
    
    return flowers 