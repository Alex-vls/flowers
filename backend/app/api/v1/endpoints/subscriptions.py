from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

from app.core.database import get_db
from app.api.v1.deps import get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.subscription import Subscription, SubscriptionStatus, SubscriptionFrequency
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionUpdate,
    Subscription as SubscriptionSchema,
    SubscriptionList,
    SubscriptionPause,
    SubscriptionResume,
    SubscriptionSkip
)

router = APIRouter()


@router.get("/", response_model=List[SubscriptionList])
def get_subscriptions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: SubscriptionStatus = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get user subscriptions"""
    query = db.query(Subscription).filter(Subscription.user_id == current_user.id)
    
    if status:
        query = query.filter(Subscription.status == status)
    
    subscriptions = query.offset(skip).limit(limit).all()
    return subscriptions


@router.get("/{subscription_id}", response_model=SubscriptionSchema)
def get_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get subscription by ID"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    return subscription


@router.post("/", response_model=SubscriptionSchema)
def create_subscription(
    subscription_in: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Create new subscription"""
    # Calculate total price based on frequency
    total_price = subscription_in.price_per_delivery
    
    # Calculate next delivery date
    next_delivery = subscription_in.start_date
    
    subscription = Subscription(
        user_id=current_user.id,
        total_price=total_price,
        next_delivery_date=next_delivery,
        **subscription_in.dict()
    )
    
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    
    return subscription


@router.put("/{subscription_id}", response_model=SubscriptionSchema)
def update_subscription(
    subscription_id: int,
    subscription_update: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Update subscription"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    for field, value in subscription_update.dict(exclude_unset=True).items():
        setattr(subscription, field, value)
    
    db.commit()
    db.refresh(subscription)
    return subscription


@router.post("/{subscription_id}/pause")
def pause_subscription(
    subscription_id: int,
    pause_data: SubscriptionPause,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Pause subscription"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    subscription.status = SubscriptionStatus.PAUSED
    db.commit()
    
    return {"message": "Subscription paused"}


@router.post("/{subscription_id}/resume")
def resume_subscription(
    subscription_id: int,
    resume_data: SubscriptionResume,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Resume subscription"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    subscription.status = SubscriptionStatus.ACTIVE
    subscription.next_delivery_date = resume_data.resume_date
    db.commit()
    
    return {"message": "Subscription resumed"}


@router.post("/{subscription_id}/skip")
def skip_delivery(
    subscription_id: int,
    skip_data: SubscriptionSkip,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Skip next delivery"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    subscription.skipped_deliveries += 1
    # TODO: Calculate next delivery date based on frequency
    db.commit()
    
    return {"message": "Delivery skipped"}


@router.post("/{subscription_id}/cancel")
def cancel_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Cancel subscription"""
    subscription = db.query(Subscription).filter(
        Subscription.id == subscription_id,
        Subscription.user_id == current_user.id
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    subscription.status = SubscriptionStatus.CANCELLED
    subscription.end_date = datetime.now()
    db.commit()
    
    return {"message": "Subscription cancelled"}


# Admin endpoints
@router.get("/admin/all", response_model=List[SubscriptionSchema])
def get_all_subscriptions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: SubscriptionStatus = None,
    user_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Get all subscriptions - admin only"""
    query = db.query(Subscription)
    
    if status:
        query = query.filter(Subscription.status == status)
    if user_id:
        query = query.filter(Subscription.user_id == user_id)
    
    subscriptions = query.offset(skip).limit(limit).all()
    return subscriptions


@router.get("/admin/upcoming")
def get_upcoming_deliveries(
    days: int = Query(7, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Get upcoming deliveries - admin only"""
    from datetime import datetime, timedelta
    
    end_date = datetime.now() + timedelta(days=days)
    subscriptions = db.query(Subscription).filter(
        Subscription.status == SubscriptionStatus.ACTIVE,
        Subscription.next_delivery_date <= end_date
    ).all()
    
    return subscriptions 