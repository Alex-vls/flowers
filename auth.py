from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
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
from app.core.rate_limiter import rate_limit
from app.models.user import User, UserRole
from app.schemas.user import (
    UserCreate,
    User as UserSchema,
    Token,
    LoginRequest,
    RegisterRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    TelegramAuthRequest,
    TelegramMiniAppAuthRequest,
    TelegramWebsiteAuthRequest,
    AuthResponse
)
from app.api.v1.telegram import send_welcome_message_on_login
import logging
import hashlib
import hmac
import json
from urllib.parse import parse_qs

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/register", response_model=UserSchema)
@rate_limit("auth_register")
def register(
    request: Request,
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
@rate_limit("auth_login")
def telegram_auth(
    request: Request,
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


@router.get("/telegram-callback")
def telegram_callback(
    request: Request,
    id: str,
    first_name: str,
    last_name: str = None,
    username: str = None,
    photo_url: str = None,
    auth_date: str = None,
    hash: str = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
) -> RedirectResponse:
    """Handle Telegram auth callback with redirect (для Firefox)"""
    try:
        # Создаем объект TelegramAuthRequest из query параметров
        auth_data = TelegramAuthRequest(
            telegram_id=id,
            first_name=first_name,
            last_name=last_name,
            username=username,
            photo_url=photo_url
        )
        
        # Check if user exists
        user = db.query(User).filter(User.telegram_id == auth_data.telegram_id).first()
        
        is_new_user = False
        if not user:
            # Create new user
            full_name = f"{auth_data.first_name} {auth_data.last_name}" if auth_data.last_name else auth_data.first_name
            user = User(
                email=f"telegram_{auth_data.telegram_id}@msk-flower.local",
                telegram_id=auth_data.telegram_id,
                full_name=full_name,
                role=UserRole.CLIENT,
                is_verified=True,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            is_new_user = True
            logger.info(f"New user created via Telegram callback: {user.id} ({auth_data.telegram_id})")
        else:
            logger.info(f"Existing user logged in via Telegram callback: {user.id} ({auth_data.telegram_id})")
        
        # Create tokens
        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})
        
        # Отправить приветственное сообщение в Telegram (в фоновом режиме)
        if background_tasks:
            background_tasks.add_task(send_welcome_message_on_login, user, is_new_user)
            logger.info(f"Welcome message task added for user {user.id} (telegram_id: {auth_data.telegram_id})")
        
        # Redirect на главную страницу с токенами в URL (будут обработаны JS)
        redirect_url = f"/?telegram_auth=success&access_token={access_token}&refresh_token={refresh_token}&user_id={user.id}&is_new_user={is_new_user}"
        
        return RedirectResponse(url=redirect_url, status_code=302)
        
    except Exception as e:
        logger.error(f"Error in telegram callback: {str(e)}")
        # Redirect с ошибкой
        return RedirectResponse(url="/?telegram_auth=error", status_code=302) 


def verify_telegram_miniapp_data(init_data: str, bot_token: str) -> dict:
    """
    Проверяет подлинность данных от Telegram Mini App
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    try:
        # Парсим данные
        parsed_data = parse_qs(init_data)
        
        # Извлекаем hash
        received_hash = parsed_data.get('hash', [None])[0]
        if not received_hash:
            raise ValueError("Hash not found in init_data")
        
        # Создаем строку для проверки (все параметры кроме hash, отсортированные по ключу)
        check_data = []
        for key, values in sorted(parsed_data.items()):
            if key != 'hash':
                check_data.append(f"{key}={values[0]}")
        
        data_check_string = '\n'.join(check_data)
        
        # Создаем секретный ключ
        secret_key = hmac.new(
            b"WebAppData", 
            bot_token.encode(), 
            hashlib.sha256
        ).digest()
        
        # Вычисляем ожидаемый hash
        expected_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Проверяем hash
        if not hmac.compare_digest(received_hash, expected_hash):
            raise ValueError("Invalid hash")
        
        # Парсим пользователя из данных
        user_data = parsed_data.get('user', [None])[0]
        if user_data:
            user_info = json.loads(user_data)
            return user_info
        
        raise ValueError("User data not found")
        
    except Exception as e:
        logger.error(f"Failed to verify Telegram Mini App data: {str(e)}")
        raise ValueError(f"Invalid Telegram data: {str(e)}")


def verify_telegram_website_data(auth_data: TelegramWebsiteAuthRequest, bot_token: str) -> bool:
    """
    Проверяет подлинность данных от Telegram Login Widget
    https://core.telegram.org/widgets/login#checking-authorization
    """
    try:
        # Создаем строку для проверки
        check_data = []
        data_dict = auth_data.dict(exclude={'hash'})
        
        for key, value in sorted(data_dict.items()):
            if value is not None:
                check_data.append(f"{key}={value}")
        
        data_check_string = '\n'.join(check_data)
        
        # Вычисляем ожидаемый hash
        secret_key = hashlib.sha256(bot_token.encode()).digest()
        expected_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Проверяем hash
        return hmac.compare_digest(auth_data.hash, expected_hash)
        
    except Exception as e:
        logger.error(f"Failed to verify Telegram website data: {str(e)}")
        return False


@router.post("/telegram-miniapp", response_model=AuthResponse)
@rate_limit("auth_login")
def telegram_miniapp_auth(
    request: Request,
    auth_data: TelegramMiniAppAuthRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> AuthResponse:
    """Авторизация через Telegram Mini App с проверкой initData"""
    try:
        # Проверяем подлинность данных от Telegram
        user_info = verify_telegram_miniapp_data(
            auth_data.init_data, 
            settings.TELEGRAM_BOT_TOKEN
        )
        
        telegram_id = str(user_info['id'])
        first_name = user_info['first_name']
        last_name = user_info.get('last_name')
        
        # Проверяем, существует ли пользователь
        user = db.query(User).filter(User.telegram_id == telegram_id).first()
        
        is_new_user = False
        if not user:
            # Создаем нового пользователя
            full_name = f"{first_name} {last_name}" if last_name else first_name
            user = User(
                email=f"telegram_{telegram_id}@msk-flower.local",
                telegram_id=telegram_id,
                full_name=full_name,
                role=UserRole.CLIENT,
                is_verified=True,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            is_new_user = True
            logger.info(f"New user created via Telegram Mini App: {user.id} ({telegram_id})")
        else:
            logger.info(f"Existing user logged in via Telegram Mini App: {user.id} ({telegram_id})")
        
        # Создаем токены
        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})
        
        # Отправляем приветственное сообщение в фоновом режиме
        background_tasks.add_task(send_welcome_message_on_login, user, is_new_user)
        logger.info(f"Welcome message task added for Mini App user {user.id}")
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.value,
                "is_verified": user.is_verified,
                "bonus_points": user.bonus_points
            },
            is_new_user=is_new_user,
            auth_method="miniapp"
        )
        
    except ValueError as e:
        logger.error(f"Telegram Mini App auth validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Telegram data: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Telegram Mini App auth error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )


@router.post("/telegram-website", response_model=AuthResponse)
@rate_limit("auth_login")
def telegram_website_auth(
    request: Request,
    auth_data: TelegramWebsiteAuthRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> AuthResponse:
    """Авторизация через веб-сайт с Telegram Login Widget"""
    try:
        # Проверяем подлинность данных от Telegram
        if not verify_telegram_website_data(auth_data, settings.TELEGRAM_BOT_TOKEN):
            raise ValueError("Invalid Telegram signature")
        
        # Проверяем, существует ли пользователь
        user = db.query(User).filter(User.telegram_id == auth_data.id).first()
        
        is_new_user = False
        if not user:
            # Создаем нового пользователя
            full_name = f"{auth_data.first_name} {auth_data.last_name}" if auth_data.last_name else auth_data.first_name
            user = User(
                email=f"telegram_{auth_data.id}@msk-flower.local",
                telegram_id=auth_data.id,
                full_name=full_name,
                role=UserRole.CLIENT,
                is_verified=True,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            is_new_user = True
            logger.info(f"New user created via Telegram website: {user.id} ({auth_data.id})")
        else:
            logger.info(f"Existing user logged in via Telegram website: {user.id} ({auth_data.id})")
        
        # Создаем токены
        access_token = create_access_token(data={"sub": user.id})
        refresh_token = create_refresh_token(data={"sub": user.id})
        
        # Отправляем приветственное сообщение в фоновом режиме
        background_tasks.add_task(send_welcome_message_on_login, user, is_new_user)
        logger.info(f"Welcome message task added for website user {user.id}")
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.value,
                "is_verified": user.is_verified,
                "bonus_points": user.bonus_points
            },
            is_new_user=is_new_user,
            auth_method="website"
        )
        
    except ValueError as e:
        logger.error(f"Telegram website auth validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Telegram data: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Telegram website auth error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        ) 