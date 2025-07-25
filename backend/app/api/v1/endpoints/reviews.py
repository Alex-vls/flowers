from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.deps import get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.review import Review
from app.schemas.review import ReviewCreate, ReviewUpdate, Review as ReviewSchema

router = APIRouter()


@router.get("/", response_model=List[ReviewSchema])
def get_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    flower_id: int = None,
    order_id: int = None,
    is_approved: bool = True,
    db: Session = Depends(get_db)
) -> Any:
    """Get reviews with filtering"""
    query = db.query(Review)
    
    if flower_id:
        query = query.filter(Review.flower_id == flower_id)
    if order_id:
        query = query.filter(Review.order_id == order_id)
    if is_approved is not None:
        query = query.filter(Review.is_approved == is_approved)
    
    reviews = query.order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    return reviews


@router.get("/{review_id}", response_model=ReviewSchema)
def get_review(
    review_id: int,
    db: Session = Depends(get_db)
) -> Any:
    """Get review by ID"""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    return review


@router.post("/", response_model=ReviewSchema)
def create_review(
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Create new review"""
    # Check if user has already reviewed this order
    existing_review = db.query(Review).filter(
        Review.order_id == review_in.order_id,
        Review.user_id == current_user.id
    ).first()
    
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this order"
        )
    
    review = Review(
        user_id=current_user.id,
        **review_in.dict()
    )
    
    db.add(review)
    db.commit()
    db.refresh(review)
    
    return review


@router.put("/{review_id}", response_model=ReviewSchema)
def update_review(
    review_id: int,
    review_update: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Update review"""
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.user_id == current_user.id
    ).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Only allow updates if review is not approved yet
    if review.is_approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update approved review"
        )
    
    for field, value in review_update.dict(exclude_unset=True).items():
        setattr(review, field, value)
    
    db.commit()
    db.refresh(review)
    return review


@router.delete("/{review_id}")
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Delete review"""
    review = db.query(Review).filter(
        Review.id == review_id,
        Review.user_id == current_user.id
    ).first()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    db.delete(review)
    db.commit()
    
    return {"message": "Review deleted"}


@router.post("/{review_id}/vote")
def vote_review(
    review_id: int,
    helpful: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Vote on review helpfulness"""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # TODO: Implement voting system with user tracking
    # For now, just increment total votes
    review.total_votes += 1
    if helpful:
        review.helpful_votes += 1
    
    db.commit()
    
    return {"message": "Vote recorded"}


# Admin endpoints
@router.get("/admin/pending", response_model=List[ReviewSchema])
def get_pending_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Get pending reviews for moderation - admin only"""
    reviews = db.query(Review).filter(
        Review.is_approved == False
    ).order_by(Review.created_at.desc()).offset(skip).limit(limit).all()
    
    return reviews


@router.post("/admin/{review_id}/approve")
def approve_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Approve review - admin only"""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    review.is_approved = True
    review.moderated_by = current_user.id
    review.moderated_at = datetime.now()
    
    db.commit()
    
    return {"message": "Review approved"}


@router.post("/admin/{review_id}/reject")
def reject_review(
    review_id: int,
    reason: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Reject review - admin only"""
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    review.is_flagged = True
    review.flagged_reason = reason
    review.moderated_by = current_user.id
    review.moderated_at = datetime.now()
    
    db.commit()
    
    return {"message": "Review rejected"}


@router.get("/admin/stats")
def get_review_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Get review statistics - admin only"""
    from sqlalchemy import func
    
    # Total reviews by approval status
    approval_stats = db.query(
        Review.is_approved,
        func.count(Review.id).label('count')
    ).group_by(Review.is_approved).all()
    
    # Average rating
    avg_rating = db.query(func.avg(Review.rating)).scalar()
    
    # Reviews by rating
    rating_stats = db.query(
        Review.rating,
        func.count(Review.id).label('count')
    ).group_by(Review.rating).all()
    
    return {
        "approval_stats": [
            {
                "is_approved": stat.is_approved,
                "count": stat.count
            }
            for stat in approval_stats
        ],
        "average_rating": float(avg_rating) if avg_rating else 0,
        "rating_distribution": [
            {
                "rating": stat.rating,
                "count": stat.count
            }
            for stat in rating_stats
        ]
    } 