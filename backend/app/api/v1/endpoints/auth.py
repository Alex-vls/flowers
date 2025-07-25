from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    get_password_hash,
    generate_password
)
from app.models.user import User, UserRole
from app.schemas.user import (
    UserCreate,
    User as UserSchema,
    Token,
    LoginRequest,
    RegisterRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    TelegramAuthRequest
)
from app.api.v1.telegram import send_welcome_message_on_login
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/register", response_model=UserSchema)
def register(
    user_in: RegisterRequest,
    db: Session = Depends(get_db)
) -> Any:
    """Register new user - punk rock style"""
    # Check if user exists
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        address=user_in.address,
        role=UserRole.CLIENT
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user


# @router.post("/login", response_model=Token)
# def login(
#     login_data: LoginRequest,
#     background_tasks: BackgroundTasks,
#     db: Session = Depends(get_db)
# ) -> Any:
#     """Login user - DEPRECATED: Use telegram-auth instead"""
#     user = db.query(User).filter(User.email == login_data.email).first()
#     if not user or not verify_password(login_data.password, user.hashed_password):
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect email or password"
#         )
#     
#     if not user.is_active:
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Inactive user"
#         )
#     
#     # Create tokens
#     access_token = create_access_token(data={"sub": user.id})
#     refresh_token = create_refresh_token(data={"sub": user.id})
#     
#     # Отправить приветственное сообщение в Telegram (в фоновом режиме)
#     if user.telegram_id:
#         background_tasks.add_task(send_welcome_message_on_login, user)
#         logger.info(f"Welcome message task added for user {user.id} (telegram_id: {user.telegram_id})")
#     else:
#         logger.info(f"User {user.id} has no telegram_id, skipping welcome message")
#     
#     return {
#         "access_token": access_token,
#         "refresh_token": refresh_token,
#         "token_type": "bearer"
#     }


@router.post("/admin-login", response_model=Token)
def admin_login(
    login_data: LoginRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Any:
    """Admin login - only for emergency access"""
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Only allow admin users
    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    # Create tokens
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    logger.info(f"Admin login: {user.id} ({user.email})")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


@router.post("/refresh", response_model=Token)
def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
) -> Any:
    """Refresh access token"""
    from app.core.security import verify_token
    
    payload = verify_token(refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user"
        )
    
    # Create new tokens
    access_token = create_access_token(data={"sub": user.id})
    new_refresh_token = create_refresh_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }


@router.post("/password-reset")
def request_password_reset(
    reset_data: PasswordResetRequest,
    db: Session = Depends(get_db)
) -> Any:
    """Request password reset - we'll send you a new one"""
    user = db.query(User).filter(User.email == reset_data.email).first()
    if user:
        # Generate new password
        new_password = generate_password()
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        
        # TODO: Send email with new password
        # For now, just return success
        return {"message": "Password reset email sent"}
    
    # Don't reveal if email exists or not
    return {"message": "Password reset email sent"}


@router.post("/password-reset/confirm")
def confirm_password_reset(
    reset_data: PasswordResetConfirm,
    db: Session = Depends(get_db)
) -> Any:
    """Confirm password reset with token"""
    # TODO: Implement token verification
    # For now, just return success
    return {"message": "Password reset successful"}


@router.post("/telegram-auth")
def telegram_auth(
    auth_data: TelegramAuthRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Any:
    """Authenticate via Telegram - main auth method now"""
    # Check if user exists
    user = db.query(User).filter(User.telegram_id == auth_data.telegram_id).first()
    
    is_new_user = False
    if not user:
        # Create new user
        full_name = f"{auth_data.first_name} {auth_data.last_name}" if auth_data.last_name else auth_data.first_name
        user = User(
            email=f"telegram_{auth_data.telegram_id}@msk-flower.local",  # Temporary email
            telegram_id=auth_data.telegram_id,
            full_name=full_name,
            role=UserRole.CLIENT,
            is_verified=True,  # Telegram users are pre-verified
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        is_new_user = True
        logger.info(f"New user created via Telegram: {user.id} ({auth_data.telegram_id})")
    else:
        logger.info(f"Existing user logged in via Telegram: {user.id} ({auth_data.telegram_id})")
    
    # Create tokens
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})
    
    # Отправить приветственное сообщение в Telegram (в фоновом режиме)
    # Отправляем для всех пользователей (и новых, и существующих)
    background_tasks.add_task(send_welcome_message_on_login, user, is_new_user)
    logger.info(f"Welcome message task added for user {user.id} (telegram_id: {auth_data.telegram_id})")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "is_verified": user.is_verified,
            "bonus_points": user.bonus_points
        },
        "is_new_user": is_new_user
    } 