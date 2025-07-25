from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
import string

from app.core.database import get_db
from app.api.v1.deps import get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.bonus import Bonus, Referral, GiftCertificate, BonusType, BonusStatus
from app.schemas.bonus import (
    BonusCreate,
    BonusUpdate,
    Bonus as BonusSchema,
    ReferralCreate,
    Referral as ReferralSchema,
    GiftCertificateCreate,
    GiftCertificate as GiftCertificateSchema
)

router = APIRouter()


@router.get("/my-bonuses", response_model=List[BonusSchema])
def get_my_bonuses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: BonusStatus = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get user bonuses"""
    query = db.query(Bonus).filter(Bonus.user_id == current_user.id)
    
    if status:
        query = query.filter(Bonus.status == status)
    
    bonuses = query.order_by(Bonus.created_at.desc()).offset(skip).limit(limit).all()
    return bonuses


@router.get("/my-bonuses/{bonus_id}", response_model=BonusSchema)
def get_my_bonus(
    bonus_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get specific bonus"""
    bonus = db.query(Bonus).filter(
        Bonus.id == bonus_id,
        Bonus.user_id == current_user.id
    ).first()
    
    if not bonus:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bonus not found"
        )
    
    return bonus


@router.get("/my-referrals", response_model=List[ReferralSchema])
def get_my_referrals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get user referrals"""
    referrals = db.query(Referral).filter(Referral.referrer_id == current_user.id).all()
    return referrals


@router.post("/referral-code")
def generate_referral_code(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Generate referral code for user"""
    # Generate unique referral code
    code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    
    # Check if code already exists
    while db.query(Referral).filter(Referral.referral_code == code).first():
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    
    return {"referral_code": code}


@router.post("/use-referral")
def use_referral_code(
    referral_code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Use referral code"""
    # Find referral by code
    referral = db.query(Referral).filter(Referral.referral_code == referral_code).first()
    
    if not referral:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid referral code"
        )
    
    if referral.referred_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Referral code already used"
        )
    
    if referral.referrer_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot use your own referral code"
        )
    
    # Update referral
    referral.referred_id = current_user.id
    referral.registered_at = datetime.now()
    
    # Give bonus to referrer
    referrer_bonus = Bonus(
        user_id=referral.referrer_id,
        type=BonusType.REFERRAL_BONUS,
        amount=100,  # 100 bonus points
        description=f"Referral bonus for {current_user.full_name}",
        expires_at=datetime.now() + timedelta(days=365)
    )
    
    # Give welcome bonus to new user
    welcome_bonus = Bonus(
        user_id=current_user.id,
        type=BonusType.WELCOME_BONUS,
        amount=50,  # 50 bonus points
        description="Welcome bonus for using referral code",
        expires_at=datetime.now() + timedelta(days=365)
    )
    
    db.add(referrer_bonus)
    db.add(welcome_bonus)
    db.commit()
    
    return {"message": "Referral code used successfully"}


@router.get("/gift-certificates", response_model=List[GiftCertificateSchema])
def get_gift_certificates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get user gift certificates"""
    certificates = db.query(GiftCertificate).filter(
        GiftCertificate.used_by_user_id == current_user.id
    ).all()
    return certificates


@router.post("/gift-certificates/activate")
def activate_gift_certificate(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Activate gift certificate"""
    certificate = db.query(GiftCertificate).filter(
        GiftCertificate.code == code,
        GiftCertificate.is_used == False
    ).first()
    
    if not certificate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or used gift certificate"
        )
    
    if certificate.expires_at and certificate.expires_at < datetime.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gift certificate has expired"
        )
    
    # Activate certificate
    certificate.is_used = True
    certificate.used_by_user_id = current_user.id
    certificate.used_at = datetime.now()
    
    # Add bonus points to user
    bonus_points = int(certificate.amount * 10)  # Convert amount to bonus points
    current_user.bonus_points += bonus_points
    
    db.commit()
    
    return {"message": "Gift certificate activated", "bonus_points_added": bonus_points}


# Admin endpoints
@router.post("/admin/create-bonus", response_model=BonusSchema)
def create_bonus(
    user_id: int,
    bonus_type: BonusType,
    amount: int,
    description: str,
    expires_at: datetime = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Create bonus for user - admin only"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    bonus = Bonus(
        user_id=user_id,
        type=bonus_type,
        amount=amount,
        description=description,
        expires_at=expires_at
    )
    
    db.add(bonus)
    db.commit()
    db.refresh(bonus)
    
    return bonus


@router.post("/admin/create-gift-certificate", response_model=GiftCertificateSchema)
def create_gift_certificate(
    amount: float,
    bouquet_count: int = None,
    description: str = None,
    expires_at: datetime = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Create gift certificate - admin only"""
    # Generate unique code
    code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(12))
    
    # Check if code already exists
    while db.query(GiftCertificate).filter(GiftCertificate.code == code).first():
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(12))
    
    certificate = GiftCertificate(
        code=code,
        amount=amount,
        bouquet_count=bouquet_count,
        description=description,
        expires_at=expires_at,
        created_by_user_id=current_user.id
    )
    
    db.add(certificate)
    db.commit()
    db.refresh(certificate)
    
    return certificate


@router.get("/admin/bonus-stats")
def get_bonus_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Get bonus statistics - admin only"""
    from sqlalchemy import func
    
    # Total bonuses by type
    type_stats = db.query(
        Bonus.type,
        func.count(Bonus.id).label('count'),
        func.sum(Bonus.amount).label('total_amount')
    ).group_by(Bonus.type).all()
    
    # Total bonuses by status
    status_stats = db.query(
        Bonus.status,
        func.count(Bonus.id).label('count'),
        func.sum(Bonus.amount).label('total_amount')
    ).group_by(Bonus.status).all()
    
    return {
        "by_type": [
            {
                "type": stat.type.value,
                "count": stat.count,
                "total_amount": int(stat.total_amount) if stat.total_amount else 0
            }
            for stat in type_stats
        ],
        "by_status": [
            {
                "status": stat.status.value,
                "count": stat.count,
                "total_amount": int(stat.total_amount) if stat.total_amount else 0
            }
            for stat in status_stats
        ]
    } 