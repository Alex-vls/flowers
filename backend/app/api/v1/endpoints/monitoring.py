"""
📊 Monitoring API Endpoints
API для мониторинга состояния системы
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import json

from app.core.database import get_db
from app.api.v1.deps import get_current_admin_user
from app.models.user import User
from app.core.monitoring import (
    get_system_health,
    get_system_metrics,
    alert_manager,
    create_alert,
    AlertLevel
)
from app.core.rate_limiter import rate_limit

router = APIRouter()
logger = logging.getLogger(__name__)

# Схемы для диагностики
class TelegramDiagnosticLog(BaseModel):
    """Лог диагностики от Telegram Mini App"""
    timestamp: str
    level: str  # 'info', 'warn', 'error'
    message: str
    data: Optional[Dict[str, Any]] = None
    user_agent: Optional[str] = None
    telegram_user_id: Optional[str] = None
    session_id: Optional[str] = None

class DiagnosticReport(BaseModel):
    """Полный отчет диагностики"""
    logs: List[TelegramDiagnosticLog]
    environment: Dict[str, Any]
    user_info: Optional[Dict[str, Any]] = None

@router.post("/telegram-diagnostics")
@rate_limit("diagnostics")
def submit_telegram_diagnostics(
    request: Request,
    report: DiagnosticReport,
    db: Session = Depends(get_db)
):
    """
    Получение диагностических данных от Telegram Mini App
    Помогает отслеживать проблемы авторизации и другие ошибки
    """
    try:
        # Логируем основную информацию
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        logger.info(f"📊 Telegram diagnostics received from {client_ip}")
        logger.info(f"🌐 Environment: {json.dumps(report.environment, ensure_ascii=False)}")
        
        # Логируем каждый лог отдельно для лучшей читаемости
        for log_entry in report.logs:
            log_level = getattr(logger, log_entry.level.lower(), logger.info)
            
            log_message = f"[TELEGRAM-{log_entry.level.upper()}] {log_entry.message}"
            if log_entry.data:
                log_message += f" | Data: {json.dumps(log_entry.data, ensure_ascii=False)}"
            
            if log_entry.telegram_user_id:
                log_message += f" | TG User: {log_entry.telegram_user_id}"
                
            log_level(log_message)
        
        # Анализируем ошибки авторизации
        auth_errors = [
            log for log in report.logs 
            if log.level == 'error' and ('auth' in log.message.lower() or 'авторизац' in log.message.lower())
        ]
        
        if auth_errors:
            logger.error(f"🚨 Обнаружены проблемы с авторизацией в Telegram Mini App:")
            for error in auth_errors:
                logger.error(f"   - {error.message}")
                if error.data:
                    logger.error(f"     Данные: {json.dumps(error.data, ensure_ascii=False)}")
        
        # Проверяем основные проблемы
        issues = []
        
        # Проверка наличия initData
        if not report.environment.get('windowTelegramWebApp') or report.environment.get('initData') == 'не доступно':
            issues.append("❌ Telegram WebApp API недоступен или приложение запущено не как Mini App")
        
        # Проверка пользователя
        if report.environment.get('initDataUnsafe') == 'не доступно':
            issues.append("❌ Данные пользователя Telegram недоступны")
        
        # Проверка браузера
        if not report.environment.get('isTelegramBrowser'):
            issues.append("⚠️ Приложение запущено не в Telegram браузере")
        
        if issues:
            logger.warning("🔍 Обнаруженные проблемы конфигурации:")
            for issue in issues:
                logger.warning(f"   {issue}")
        
        return {
            "status": "received",
            "logs_processed": len(report.logs),
            "issues_detected": len(issues),
            "recommendations": generate_recommendations(report, issues)
        }
        
    except Exception as e:
        logger.error(f"❌ Ошибка обработки диагностики: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка обработки диагностических данных"
        )

def generate_recommendations(report: DiagnosticReport, issues: List[str]) -> List[str]:
    """Генерация рекомендаций для исправления проблем"""
    recommendations = []
    
    # Анализируем environment
    env = report.environment
    
    if not env.get('windowTelegramWebApp'):
        recommendations.extend([
            "🔧 Убедитесь что приложение запускается через Menu Button бота",
            "🔧 Проверьте настройки Web App URL в @BotFather",
            "🔧 URL должен быть: https://msk-flower.su/telegram"
        ])
    
    if env.get('initData') == 'не доступно':
        recommendations.extend([
            "🔧 Проверьте что бот правильно настроен для Mini App",
            "🔧 Убедитесь что используется правильный домен в настройках бота",
            "🔧 Проверьте HTTPS сертификат домена"
        ])
    
    if not env.get('isTelegramBrowser'):
        recommendations.append("ℹ️ Откройте приложение в официальном клиенте Telegram")
    
    # Анализируем ошибки в логах
    error_logs = [log for log in report.logs if log.level == 'error']
    for error in error_logs:
        if 'Invalid Telegram data' in error.message:
            recommendations.extend([
                "🔧 Проверьте TELEGRAM_BOT_TOKEN в конфигурации сервера",
                "🔧 Убедитесь что токен бота совпадает с настройками в @BotFather"
            ])
        
        if 'initData не доступны' in error.message:
            recommendations.extend([
                "🔧 Перезапустите диалог с ботом командой /start",
                "🔧 Очистите кэш Telegram и попробуйте снова"
            ])
    
    if not recommendations:
        recommendations.append("✅ Система работает корректно")
    
    return recommendations

@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    Проверка состояния системы
    Доступно без авторизации для load balancer'ов
    """
    try:
        health_status = await get_system_health()
        
        # Возвращаем соответствующий HTTP статус
        if health_status["status"] == "unhealthy":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=health_status
            )
        elif health_status["status"] == "degraded":
            # 200 OK, но с предупреждением
            return {
                **health_status,
                "warning": "System is running but some components are degraded"
            }
        
        return health_status
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "status": "error",
                "message": f"Health check failed: {str(e)}"
            }
        )

@router.get("/metrics")
async def get_metrics(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """
    Получить метрики системы
    Только для администраторов
    """
    try:
        metrics = await get_system_metrics()
        return {
            "status": "success",
            "data": {
                "timestamp": metrics.timestamp.isoformat(),
                "system": {
                    "cpu_percent": metrics.cpu_percent,
                    "memory_percent": metrics.memory_percent,
                    "disk_percent": metrics.disk_percent,
                },
                "application": {
                    "active_connections": metrics.active_connections,
                    "response_time_avg": metrics.response_time_avg,
                    "error_rate": metrics.error_rate,
                    "requests_per_minute": metrics.requests_per_minute,
                }
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get metrics: {str(e)}"
        )

@router.get("/alerts")
async def get_alerts(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """
    Получить активные алерты
    Только для администраторов
    """
    try:
        alerts = await alert_manager.get_active_alerts()
        return {
            "status": "success",
            "data": {
                "active_alerts": alerts,
                "count": len(alerts)
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get alerts: {str(e)}"
        )

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """
    Разрешить алерт
    Только для администраторов
    """
    try:
        success = await alert_manager.resolve_alert(alert_id)
        
        if success:
            return {
                "status": "success",
                "message": f"Alert {alert_id} resolved successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert {alert_id} not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve alert: {str(e)}"
        )

@router.post("/alerts/test")
async def create_test_alert(
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """
    Создать тестовый алерт (для проверки системы уведомлений)
    Только для администраторов
    """
    try:
        alert = await create_alert(
            level=AlertLevel.INFO,
            title="Test Alert",
            message="This is a test alert created by admin",
            source="manual_test"
        )
        
        return {
            "status": "success",
            "message": "Test alert created successfully",
            "alert_id": alert.id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create test alert: {str(e)}"
        )

@router.get("/stats")
async def get_system_stats(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Получить общую статистику системы
    Только для администраторов
    """
    try:
        from app.models.user import User as UserModel
        from app.models.order import Order
        from app.models.flower import Flower
        from app.models.review import Review
        from sqlalchemy import func, text
        
        # Статистика пользователей
        total_users = db.query(UserModel).count()
        active_users = db.query(UserModel).filter(UserModel.is_active == True).count()
        
        # Статистика заказов
        total_orders = db.query(Order).count()
        today_orders = db.query(Order).filter(
            func.date(Order.created_at) == func.current_date()
        ).count()
        
        # Статистика цветов
        total_flowers = db.query(Flower).count()
        available_flowers = db.query(Flower).filter(Flower.is_available == True).count()
        
        # Статистика отзывов
        total_reviews = db.query(Review).count()
        avg_rating = db.query(func.avg(Review.rating)).scalar() or 0
        
        # Статистика базы данных
        db_size_result = db.execute(text(
            "SELECT pg_size_pretty(pg_database_size(current_database()))"
        )).scalar()
        
        return {
            "status": "success",
            "data": {
                "users": {
                    "total": total_users,
                    "active": active_users,
                    "inactive": total_users - active_users
                },
                "orders": {
                    "total": total_orders,
                    "today": today_orders
                },
                "flowers": {
                    "total": total_flowers,
                    "available": available_flowers,
                    "unavailable": total_flowers - available_flowers
                },
                "reviews": {
                    "total": total_reviews,
                    "average_rating": round(float(avg_rating), 2)
                },
                "database": {
                    "size": db_size_result
                }
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system stats: {str(e)}"
        )

@router.get("/logs")
async def get_recent_logs(
    lines: int = 100,
    level: str = "ERROR",
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """
    Получить последние логи системы
    Только для администраторов
    """
    try:
        import subprocess
        
        # Получаем логи из journalctl или файла
        try:
            # Пытаемся получить логи через journalctl (systemd)
            cmd = f"journalctl -u flower-backend -n {lines} --no-pager"
            result = subprocess.run(
                cmd.split(),
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                logs = result.stdout.split('\n')
            else:
                # Fallback к файлу логов
                with open('/var/log/flower/app.log', 'r') as f:
                    logs = f.readlines()[-lines:]
        
        except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
            # Если не можем получить логи, возвращаем пустой список
            logs = ["Logs not available"]
        
        # Фильтруем по уровню если указан
        if level != "ALL":
            filtered_logs = [log for log in logs if level.upper() in log.upper()]
        else:
            filtered_logs = logs
        
        return {
            "status": "success",
            "data": {
                "logs": filtered_logs[-lines:],
                "total_lines": len(filtered_logs),
                "level_filter": level
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to retrieve logs: {str(e)}",
            "data": {
                "logs": [],
                "total_lines": 0,
                "level_filter": level
            }
        } 

@router.get("/health")
def health_check():
    """Проверка состояния системы мониторинга"""
    return {
        "status": "healthy",
        "service": "telegram-monitoring",
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/telegram-status")
def telegram_status():
    """Статус Telegram интеграции"""
    from app.core.config import settings
    
    return {
        "bot_configured": bool(settings.TELEGRAM_BOT_TOKEN),
        "bot_username": settings.TELEGRAM_BOT_USERNAME,
        "webhook_url": settings.TELEGRAM_WEBHOOK_URL,
        "mini_app_url": "https://msk-flower.su/telegram",
        "status": "configured" if settings.TELEGRAM_BOT_TOKEN else "not_configured"
    } 