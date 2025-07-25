from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.deps import get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.order import Order
from app.schemas.payment import PaymentCreate, PaymentUpdate, Payment as PaymentSchema

router = APIRouter()


@router.get("/", response_model=List[PaymentSchema])
def get_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: PaymentStatus = None,
    method: PaymentMethod = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get user payments"""
    query = db.query(Payment).filter(Payment.user_id == current_user.id)
    
    if status:
        query = query.filter(Payment.status == status)
    if method:
        query = query.filter(Payment.method == method)
    
    payments = query.order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()
    return payments


@router.get("/{payment_id}", response_model=PaymentSchema)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get payment by ID"""
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user.id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    return payment


@router.post("/create", response_model=PaymentSchema)
def create_payment(
    order_id: int,
    method: PaymentMethod,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Create payment for order"""
    # Check if order exists and belongs to user
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if payment already exists
    existing_payment = db.query(Payment).filter(
        Payment.order_id == order_id,
        Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.COMPLETED])
    ).first()
    
    if existing_payment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment already exists for this order"
        )
    
    # Create payment
    payment = Payment(
        order_id=order_id,
        user_id=current_user.id,
        amount=order.total_amount,
        method=method,
        description=f"Payment for order {order.order_number}"
    )
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    
    # TODO: Integrate with payment gateway (ЮMoney)
    # For now, just return the payment object
    
    return payment


@router.post("/{payment_id}/process")
def process_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Process payment - integrate with payment gateway"""
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user.id
    ).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    if payment.status != PaymentStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment is not pending"
        )
    
    # TODO: Integrate with ЮMoney API
    # For now, simulate successful payment
    payment.status = PaymentStatus.COMPLETED
    payment.processed_at = datetime.now()
    payment.external_transaction_id = f"TXN_{payment_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Update order payment status
    order = db.query(Order).filter(Order.id == payment.order_id).first()
    if order:
        order.payment_status = PaymentStatus.COMPLETED
        order.paid_at = datetime.now()
    
    db.commit()
    
    return {"message": "Payment processed successfully", "payment": payment}


@router.post("/{payment_id}/refund")
def refund_payment(
    payment_id: int,
    amount: float = None,
    reason: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Refund payment - admin only"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    if payment.status != PaymentStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment is not completed"
        )
    
    # TODO: Integrate with payment gateway for refund
    # For now, just mark as refunded
    payment.status = PaymentStatus.REFUNDED
    payment.refunded_at = datetime.now()
    
    # Update order payment status
    order = db.query(Order).filter(Order.id == payment.order_id).first()
    if order:
        order.payment_status = PaymentStatus.REFUNDED
    
    db.commit()
    
    return {"message": "Payment refunded successfully"}


# Admin endpoints
@router.get("/admin/all", response_model=List[PaymentSchema])
def get_all_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: PaymentStatus = None,
    method: PaymentMethod = None,
    user_id: int = None,
    date_from: datetime = None,
    date_to: datetime = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Get all payments - admin only"""
    query = db.query(Payment)
    
    if status:
        query = query.filter(Payment.status == status)
    if method:
        query = query.filter(Payment.method == method)
    if user_id:
        query = query.filter(Payment.user_id == user_id)
    if date_from:
        query = query.filter(Payment.created_at >= date_from)
    if date_to:
        query = query.filter(Payment.created_at <= date_to)
    
    payments = query.order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()
    return payments


@router.get("/admin/stats")
def get_payment_stats(
    date_from: datetime = None,
    date_to: datetime = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Get payment statistics - admin only"""
    from sqlalchemy import func
    
    query = db.query(Payment)
    
    if date_from:
        query = query.filter(Payment.created_at >= date_from)
    if date_to:
        query = query.filter(Payment.created_at <= date_to)
    
    # Total amounts by status
    stats = db.query(
        Payment.status,
        func.count(Payment.id).label('count'),
        func.sum(Payment.amount).label('total_amount')
    ).filter(
        Payment.created_at >= date_from if date_from else True,
        Payment.created_at <= date_to if date_to else True
    ).group_by(Payment.status).all()
    
    # Total amounts by method
    method_stats = db.query(
        Payment.method,
        func.count(Payment.id).label('count'),
        func.sum(Payment.amount).label('total_amount')
    ).filter(
        Payment.created_at >= date_from if date_from else True,
        Payment.created_at <= date_to if date_to else True
    ).group_by(Payment.method).all()
    
    return {
        "by_status": [
            {
                "status": stat.status.value,
                "count": stat.count,
                "total_amount": float(stat.total_amount) if stat.total_amount else 0
            }
            for stat in stats
        ],
        "by_method": [
            {
                "method": stat.method.value,
                "count": stat.count,
                "total_amount": float(stat.total_amount) if stat.total_amount else 0
            }
            for stat in method_stats
        ]
    } 