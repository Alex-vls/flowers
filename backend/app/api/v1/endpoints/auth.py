from datetime import timedelta
from typing import Any, Dict
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
    TelegramMiniAppAuthRequest,
    TelegramWebsiteAuthRequest,
    AuthResponse
)
from app.api.v1.telegram import send_welcome_message_on_login
import logging
import hashlib
import hmac
import json
import time
from urllib.parse import parse_qs
from datetime import datetime

router = APIRouter()
logger = logging.getLogger(__name__)

# ✅ НОВОЕ: Детальное логирование auth операций
def log_auth_attempt(
    method: str,
    request: Request,
    user_data: Dict[str, Any] = None,
    success: bool = False,
    error: str = None,
    user_id: int = None
):
    """
    Логирование всех попыток авторизации для audit
    """
    # Получаем IP адрес с учетом прокси
    ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    if not ip:
        ip = request.headers.get("X-Real-IP", "")
    if not ip:
        ip = request.client.host if request.client else "unknown"
    
    user_agent = request.headers.get("User-Agent", "Unknown")
    timestamp = datetime.utcnow().isoformat()
    
    log_data = {
        "timestamp": timestamp,
        "method": method,
        "ip_address": ip,
        "user_agent": user_agent,
        "success": success,
        "user_id": user_id,
        "endpoint": str(request.url.path),
    }
    
    if user_data:
        # Логируем только безопасные данные
        safe_user_data = {
            "telegram_id": user_data.get("telegram_id"),
            "email": user_data.get("email", "").split("@")[0] + "@***" if "@" in str(user_data.get("email", "")) else None,
            "full_name": user_data.get("full_name", "").split()[0] if user_data.get("full_name") else None,
            "is_new_user": user_data.get("is_new_user", False)
        }
        log_data["user_data"] = safe_user_data
    
    if error:
        log_data["error"] = error
    
    if success:
        logger.info(f"🔐 AUTH SUCCESS: {json.dumps(log_data, ensure_ascii=False)}")
    else:
        logger.warning(f"🚨 AUTH FAILED: {json.dumps(log_data, ensure_ascii=False)}")


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


@router.post("/login", response_model=Token)
@rate_limit("auth_login")
def login(
    request: Request,
    user_credentials: LoginRequest, 
    db: Session = Depends(get_db)
) -> Any:
    """Standard email/password login"""
    start_time = time.time()
    
    try:
        user = db.query(User).filter(User.email == user_credentials.email).first()
        if not user or not verify_password(user_credentials.password, user.hashed_password):
            log_auth_attempt(
                method="email_password",
                request=request,
                user_data={"email": user_credentials.email},
                success=False,
                error="Invalid credentials"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )
        
        if not user.is_active:
            log_auth_attempt(
                method="email_password",
                request=request,
                user_data={"email": user_credentials.email},
                success=False,
                error="User inactive",
                user_id=user.id
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        # ✅ ИСПРАВЛЕНО: JWT требует sub как строку
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        log_auth_attempt(
            method="email_password",
            request=request,
            user_data={
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role.value
            },
            success=True,
            user_id=user.id
        )
        
        logger.info(f"📊 AUTH PERFORMANCE: email_password took {(time.time() - start_time):.3f}s for user {user.id}")
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log_auth_attempt(
            method="email_password",
            request=request,
            user_data={"email": user_credentials.email},
            success=False,
            error=f"System error: {str(e)}"
        )
        logger.error(f"Login system error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )


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
    request: Request,
    refresh_request: dict,  # ✅ ИСПРАВЛЕНО: принимаем JSON вместо простого параметра
    db: Session = Depends(get_db)
) -> Any:
    """Refresh access token"""
    start_time = time.time()
    
    try:
        from app.core.security import verify_token
        
        # ✅ ИСПРАВЛЕНО: извлекаем refresh_token из JSON
        refresh_token = refresh_request.get('refresh_token')
        if not refresh_token:
            log_auth_attempt(
                method="token_refresh",
                request=request,
                success=False,
                error="Missing refresh_token field"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing refresh_token field"
            )
        
        payload = verify_token(refresh_token)
        if not payload:
            log_auth_attempt(
                method="token_refresh",
                request=request,
                success=False,
                error="Invalid refresh token"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        user_id = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            log_auth_attempt(
                method="token_refresh",
                request=request,
                success=False,
                error="Invalid user",
                user_id=user_id
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid user"
            )
        
        # Create new tokens
        # ✅ ИСПРАВЛЕНО: JWT требует sub как строку
        access_token = create_access_token(data={"sub": str(user.id)})
        new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        log_auth_attempt(
            method="token_refresh",
            request=request,
            success=True,
            user_id=user.id
        )
        
        logger.info(f"📊 AUTH PERFORMANCE: token_refresh took {(time.time() - start_time):.3f}s for user {user.id}")
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log_auth_attempt(
            method="token_refresh",
            request=request,
            success=False,
            error=f"System error: {str(e)}"
        )
        logger.error(f"Token refresh system error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


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


# Старые endpoints удалены - используйте /telegram-miniapp и /telegram-website


def verify_telegram_miniapp_data(init_data: str, bot_token: str) -> dict:
    """
    Проверяет подлинность данных от Telegram Mini App
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    try:
        logger.info(f"🔐 Verifying Telegram Mini App data...")
        logger.info(f"🔍 Bot token (first 10 chars): {bot_token[:10]}...")
        logger.info(f"🔍 Init data length: {len(init_data)}")
        
        # Парсим данные
        parsed_data = parse_qs(init_data)
        logger.info(f"🔍 Parsed data keys: {list(parsed_data.keys())}")
        
        # Извлекаем hash
        received_hash = parsed_data.get('hash', [None])[0]
        if not received_hash:
            logger.error("❌ Hash not found in init_data")
            raise ValueError("Hash not found in init_data")
        
        logger.info(f"🔍 Received hash: {received_hash}")
        
        # Создаем строку для проверки (все параметры кроме hash, отсортированные по ключу)
        check_data = []
        for key, values in sorted(parsed_data.items()):
            if key != 'hash':
                check_data.append(f"{key}={values[0]}")
        
        data_check_string = '\n'.join(check_data)
        logger.info(f"🔍 Data check string: {data_check_string}")
        
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
        
        logger.info(f"🔍 Expected hash: {expected_hash}")
        
        # Проверяем hash
        if not hmac.compare_digest(received_hash, expected_hash):
            logger.error(f"❌ Hash mismatch! Received: {received_hash}, Expected: {expected_hash}")
            raise ValueError("Invalid hash")
        
        logger.info("✅ Hash verification successful!")
        
        # Парсим пользователя из данных
        user_data = parsed_data.get('user', [None])[0]
        if user_data:
            user_info = json.loads(user_data)
            logger.info(f"✅ User data parsed: {user_info}")
            return user_info
        
        logger.error("❌ User data not found in parsed data")
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
        # ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Проверяем возраст данных авторизации
        import time
        current_time = int(time.time())
        
        # Данные не должны быть старше 24 часов (86400 секунд)
        if current_time - auth_data.auth_date > 86400:
            logger.warning(f"Telegram auth data too old: {current_time - auth_data.auth_date} seconds")
            return False
        
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
        is_valid = hmac.compare_digest(auth_data.hash, expected_hash)
        
        if is_valid:
            logger.info(f"Telegram website auth verified successfully for user {auth_data.id}")
        else:
            logger.warning(f"Invalid Telegram website auth hash for user {auth_data.id}")
        
        return is_valid
        
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
    start_time = time.time()
    
    try:
        # Проверяем подлинность данных от Telegram
        user_info = verify_telegram_miniapp_data(
            auth_data.init_data, 
            settings.TELEGRAM_BOT_TOKEN
        )
        
        telegram_id = str(user_info['id'])
        first_name = user_info['first_name']
        last_name = user_info.get('last_name')
        # ✅ ИСПРАВЛЕНО: Определяем full_name ДО проверки пользователя
        full_name = f"{first_name} {last_name}" if last_name else first_name
        
        # ✅ ИСПРАВЛЕНО: Используем try/finally для безопасной работы с транзакциями
        try:
            # Проверяем, существует ли пользователь
            user = db.query(User).filter(User.telegram_id == telegram_id).first()
            
            is_new_user = False
            if not user:
                # Создаем нового пользователя
                user = User(
                    email=f"telegram_{telegram_id}@tg.app",
                    telegram_id=telegram_id,
                    full_name=full_name,
                    role=UserRole.CLIENT,
                    is_verified=True,
                    is_active=True
                )
                db.add(user)
                db.flush()  # ✅ ИСПРАВЛЕНО: flush вместо commit для получения ID
                is_new_user = True
            
            # ✅ ИСПРАВЛЕНО: Сохраняем данные пользователя сразу после flush
            user_id = user.id
            user_email = user.email
            user_full_name = user.full_name
            user_role = user.role.value
            user_is_verified = user.is_verified
            user_bonus_points = user.bonus_points
            
            # ✅ ИСПРАВЛЕНО: Только ОДИН commit в конце
            if is_new_user:
                db.commit()
                
        except Exception as db_error:
            db.rollback()
            raise db_error
        
        # Создаем токены
        # ✅ ИСПРАВЛЕНО: JWT требует sub как строку, не число
        access_token = create_access_token(data={"sub": str(user_id)})
        refresh_token = create_refresh_token(data={"sub": str(user_id)})
        
        # ✅ ОТЛАДКА: Логируем созданные токены
        logger.info(f"🔐 CREATED TOKENS for user {user_id}: access_token_len={len(access_token)}, refresh_token_len={len(refresh_token)}")
        logger.info(f"🔐 ACCESS TOKEN preview: {access_token[:50]}...")
        logger.info(f"🔐 REFRESH TOKEN preview: {refresh_token[:50]}...")
        
        # ✅ НОВОЕ: Детальное логирование успешной авторизации
        log_auth_attempt(
            method="telegram_miniapp",
            request=request,
            user_data={
                "telegram_id": telegram_id,
                "full_name": full_name,
                "is_new_user": is_new_user,
                "role": user_role
            },
            success=True,
            user_id=user_id
        )
        
        logger.info(f"📊 AUTH PERFORMANCE: telegram_miniapp took {(time.time() - start_time):.3f}s for user {user_id}")
        
        # Отправляем приветственное сообщение в фоновом режиме (передаем user объект до detach)
        if is_new_user:
            background_tasks.add_task(send_welcome_message_on_login, user, is_new_user)
        
        response = AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user={
                "id": user_id,
                "email": user_email,
                "full_name": user_full_name,
                "role": user_role,
                "is_verified": user_is_verified,
                "bonus_points": user_bonus_points
            },
            is_new_user=is_new_user,
            auth_method="miniapp"
        )
        
        # ✅ ОТЛАДКА: Логируем response
        logger.info(f"🔐 RETURNING AuthResponse for user {user_id}: access_token_in_response={len(response.access_token)}")
        
        return response
        
    except ValueError as ve:
        log_auth_attempt(
            method="telegram_miniapp",
            request=request,
            success=False,
            error=f"Validation error: {str(ve)}"
        )
        logger.warning(f"Telegram Mini App auth validation failed: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Telegram data: {str(ve)}"
        )
    except Exception as e:
        log_auth_attempt(
            method="telegram_miniapp",
            request=request,
            success=False,
            error=f"System error: {str(e)}"
        )
        logger.error(f"Telegram Mini App auth failed with error: {str(e)}")
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
    start_time = time.time()
    
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
                email=f"telegram_{auth_data.id}@tg.app",
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
        
        # Создаем токены
        # ✅ ИСПРАВЛЕНО: JWT требует sub как строку
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        # ✅ НОВОЕ: Детальное логирование успешной авторизации
        log_auth_attempt(
            method="telegram_website",
            request=request,
            user_data={
                "telegram_id": auth_data.id,
                "full_name": full_name,
                "is_new_user": is_new_user,
                "role": user.role.value
            },
            success=True,
            user_id=user.id
        )
        
        logger.info(f"📊 AUTH PERFORMANCE: telegram_website took {(time.time() - start_time):.3f}s for user {user.id}")
        
        # Отправляем приветственное сообщение в фоновом режиме
        background_tasks.add_task(send_welcome_message_on_login, user, is_new_user)
        
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
        
    except ValueError as ve:
        log_auth_attempt(
            method="telegram_website",
            request=request,
            user_data={"telegram_id": auth_data.id if hasattr(auth_data, 'id') else None},
            success=False,
            error=f"Validation error: {str(ve)}"
        )
        logger.warning(f"Telegram website auth validation failed: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Telegram data: {str(ve)}"
        )
    except Exception as e:
        log_auth_attempt(
            method="telegram_website",
            request=request,
            user_data={"telegram_id": auth_data.id if hasattr(auth_data, 'id') else None},
            success=False,
            error=f"System error: {str(e)}"
        )
        logger.error(f"Telegram website auth failed with error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication failed"
        )


# ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Удален небезопасный /telegram-fallback endpoint
# Этот endpoint не имел никакой валидации и позволял авторизацию с произвольными данными
# Оставлены только безопасные методы: /telegram-miniapp и /telegram-website 