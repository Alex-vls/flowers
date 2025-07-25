from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.api.v1.deps import get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.notification import Notification, NotificationType, NotificationChannel, NotificationStatus
from app.schemas.notification import NotificationCreate, NotificationUpdate, Notification as NotificationSchema

router = APIRouter()


@router.get("/", response_model=List[NotificationSchema])
def get_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    type: NotificationType = None,
    channel: NotificationChannel = None,
    status: NotificationStatus = None,
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get user notifications"""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if type:
        query = query.filter(Notification.type == type)
    if channel:
        query = query.filter(Notification.channel == channel)
    if status:
        query = query.filter(Notification.status == status)
    if unread_only:
        query = query.filter(Notification.status == NotificationStatus.PENDING)
    
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    return notifications


@router.get("/{notification_id}", response_model=NotificationSchema)
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get notification by ID"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return notification


@router.post("/{notification_id}/read")
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Mark notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    notification.status = NotificationStatus.READ
    notification.read_at = datetime.now()
    db.commit()
    
    return {"message": "Notification marked as read"}


@router.post("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Mark all notifications as read"""
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.status == NotificationStatus.PENDING
    ).all()
    
    for notification in notifications:
        notification.status = NotificationStatus.READ
        notification.read_at = datetime.now()
    
    db.commit()
    
    return {"message": f"Marked {len(notifications)} notifications as read"}


@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get count of unread notifications"""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.status == NotificationStatus.PENDING
    ).count()
    
    return {"unread_count": count}


# Admin endpoints
@router.get("/admin/all", response_model=List[NotificationSchema])
def get_all_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    type: NotificationType = None,
    channel: NotificationChannel = None,
    status: NotificationStatus = None,
    user_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Get all notifications - admin only"""
    query = db.query(Notification)
    
    if type:
        query = query.filter(Notification.type == type)
    if channel:
        query = query.filter(Notification.channel == channel)
    if status:
        query = query.filter(Notification.status == status)
    if user_id:
        query = query.filter(Notification.user_id == user_id)
    
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    return notifications


@router.post("/admin/send", response_model=NotificationSchema)
def send_notification(
    user_id: int,
    type: NotificationType,
    channel: NotificationChannel,
    title: str,
    content: str,
    metadata: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Send notification to user - admin only"""
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    notification = Notification(
        user_id=user_id,
        type=type,
        channel=channel,
        title=title,
        content=content,
        metadata=metadata
    )
    
    db.add(notification)
    db.commit()
    db.refresh(notification)
    
    # TODO: Actually send notification via appropriate channel
    # For now, just mark as sent
    notification.status = NotificationStatus.SENT
    notification.sent_at = datetime.now()
    db.commit()
    
    return notification


@router.post("/admin/broadcast")
def broadcast_notification(
    type: NotificationType,
    channel: NotificationChannel,
    title: str,
    content: str,
    metadata: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Send notification to all users - admin only"""
    # Get all active users
    users = db.query(User).filter(User.is_active == True).all()
    
    notifications = []
    for user in users:
        notification = Notification(
            user_id=user.id,
            type=type,
            channel=channel,
            title=title,
            content=content,
            metadata=metadata
        )
        notifications.append(notification)
    
    db.add_all(notifications)
    db.commit()
    
    # TODO: Actually send notifications via appropriate channels
    # For now, just mark as sent
    for notification in notifications:
        notification.status = NotificationStatus.SENT
        notification.sent_at = datetime.now()
    
    db.commit()
    
    return {"message": f"Broadcast notification sent to {len(users)} users"}


@router.get("/admin/stats")
def get_notification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
) -> Any:
    """Get notification statistics - admin only"""
    from sqlalchemy import func
    
    # Total notifications by status
    status_stats = db.query(
        Notification.status,
        func.count(Notification.id).label('count')
    ).group_by(Notification.status).all()
    
    # Total notifications by type
    type_stats = db.query(
        Notification.type,
        func.count(Notification.id).label('count')
    ).group_by(Notification.type).all()
    
    # Total notifications by channel
    channel_stats = db.query(
        Notification.channel,
        func.count(Notification.id).label('count')
    ).group_by(Notification.channel).all()
    
    return {
        "by_status": [
            {
                "status": stat.status.value,
                "count": stat.count
            }
            for stat in status_stats
        ],
        "by_type": [
            {
                "type": stat.type.value,
                "count": stat.count
            }
            for stat in type_stats
        ],
        "by_channel": [
            {
                "channel": stat.channel.value,
                "count": stat.count
            }
            for stat in channel_stats
        ]
    } 