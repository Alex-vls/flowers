from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db
from app.api.v1.deps import get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.flower import Flower
from app.schemas.order import (
    OrderCreate,
    OrderUpdate,
    Order as OrderSchema,
    OrderList,
    OrderStatusUpdate,
    OrderFilter
)

router = APIRouter()


@router.get("/", response_model=List[OrderList])
def get_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: OrderStatus = None,
    payment_status: PaymentStatus = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get user orders"""
    query = db.query(Order).filter(Order.user_id == current_user.id)
    
    if status:
        query = query.filter(Order.status == status)
    if payment_status:
        query = query.filter(Order.payment_status == payment_status)
    
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    return orders


@router.get("/{order_id}", response_model=OrderSchema)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get order by ID"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    return order


@router.post("/", response_model=OrderSchema)
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Create new order"""
    # Generate order number
    order_number = f"FL-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
    
    # Calculate totals
    subtotal = 0
    order_items = []
    
    for item in order_in.items:
        flower = db.query(Flower).filter(Flower.id == item.flower_id).first()
        if not flower:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Flower {item.flower_id} not found"
            )
        
        if not flower.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Flower {flower.name} is not available"
            )
        
        if item.quantity < flower.min_order_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Minimum quantity for {flower.name} is {flower.min_order_quantity}"
            )
        
        if item.quantity > flower.max_order_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum quantity for {flower.name} is {flower.max_order_quantity}"
            )
        
        item_total = flower.price * item.quantity
        subtotal += item_total
        
        order_items.append({
            "flower_id": item.flower_id,
            "quantity": item.quantity,
            "unit_price": flower.price,
            "total_price": item_total,
            "notes": item.notes
        })
    
    # Calculate delivery fee (simple logic for now)
    delivery_fee = 0 if subtotal > 1000 else 200
    
    # Create order
    order = Order(
        order_number=order_number,
        user_id=current_user.id,
        subscription_id=order_in.subscription_id,
        delivery_address=order_in.delivery_address,
        delivery_date=order_in.delivery_date,
        delivery_slot=order_in.delivery_slot,
        delivery_instructions=order_in.delivery_instructions,
        customer_notes=order_in.customer_notes,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        total_amount=subtotal + delivery_fee
    )
    
    db.add(order)
    db.commit()
    db.refresh(order)
    
    # Create order items
    for item_data in order_items:
        order_item = OrderItem(
            order_id=order.id,
            **item_data
        )
        db.add(order_item)
    
    db.commit()
    db.refresh(order)
    
    return order


@router.put("/{order_id}", response_model=OrderSchema)
def update_order(
    order_id: int,
    order_update: OrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Update order"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Only allow updates for pending orders
    if order.status != OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update order that is not pending"
        )
    
    for field, value in order_update.dict(exclude_unset=True).items():
        setattr(order, field, value)
    
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/cancel")
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Cancel order"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.status not in [OrderStatus.PENDING, OrderStatus.CONFIRMED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel order in current status"
        )
    
    order.status = OrderStatus.CANCELLED
    db.commit()
    
    return {"message": "Order cancelled"}


# Admin endpoints
@router.get("/admin/all", response_model=List[OrderSchema])
def get_all_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: OrderStatus = None,
    payment_status: PaymentStatus = None,
    user_id: int = None,
    date_from: datetime = None,
    date_to: datetime = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Get all orders - admin only"""
    query = db.query(Order)
    
    if status:
        query = query.filter(Order.status == status)
    if payment_status:
        query = query.filter(Order.payment_status == payment_status)
    if user_id:
        query = query.filter(Order.user_id == user_id)
    if date_from:
        query = query.filter(Order.created_at >= date_from)
    if date_to:
        query = query.filter(Order.created_at <= date_to)
    
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    return orders


@router.put("/admin/{order_id}/status", response_model=OrderSchema)
def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Update order status - admin only"""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    order.status = status_update.status
    if status_update.admin_notes:
        order.admin_notes = status_update.admin_notes
    
    db.commit()
    db.refresh(order)
    return order


@router.get("/admin/today")
def get_today_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Get today's orders - admin only"""
    from datetime import date
    
    today = date.today()
    orders = db.query(Order).filter(
        Order.delivery_date >= today,
        Order.delivery_date < today + timedelta(days=1),
        Order.status.in_([OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.DELIVERING])
    ).all()
    
    return orders 