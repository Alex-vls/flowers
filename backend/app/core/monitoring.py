"""
📊 Monitoring & Alerting System
Система мониторинга и уведомлений о состоянии приложения
"""

import time
import psutil
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio
import aiohttp
import redis
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.redis import redis_client

logger = logging.getLogger(__name__)

class AlertLevel(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class SystemMetrics:
    """Системные метрики"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    active_connections: int
    response_time_avg: float
    error_rate: float
    requests_per_minute: int

@dataclass
class Alert:
    """Структура алерта"""
    id: str
    level: AlertLevel
    title: str
    message: str
    timestamp: datetime
    source: str
    resolved: bool = False
    resolved_at: Optional[datetime] = None

class HealthChecker:
    """Проверка состояния системы"""
    
    def __init__(self):
        self.redis_client = redis_client
        self.checks = {
            'database': self._check_database,
            'redis': self._check_redis,
            'disk_space': self._check_disk_space,
            'memory': self._check_memory,
            'cpu': self._check_cpu,
            'response_time': self._check_response_time,
        }
    
    async def run_health_checks(self) -> Dict[str, Any]:
        """Запускает все проверки здоровья системы"""
        results = {}
        overall_status = "healthy"
        
        for check_name, check_func in self.checks.items():
            try:
                result = await check_func()
                results[check_name] = result
                
                if result['status'] == 'error':
                    overall_status = "unhealthy"
                elif result['status'] == 'warning' and overall_status == "healthy":
                    overall_status = "degraded"
                    
            except Exception as e:
                logger.error(f"Health check {check_name} failed: {e}")
                results[check_name] = {
                    'status': 'error',
                    'message': f'Check failed: {str(e)}',
                    'timestamp': datetime.utcnow().isoformat()
                }
                overall_status = "unhealthy"
        
        return {
            'status': overall_status,
            'timestamp': datetime.utcnow().isoformat(),
            'checks': results
        }
    
    async def _check_database(self) -> Dict[str, Any]:
        """Проверка подключения к базе данных"""
        try:
            db = next(get_db())
            result = db.execute(text("SELECT 1")).scalar()
            db.close()
            
            if result == 1:
                return {
                    'status': 'healthy',
                    'message': 'Database connection OK',
                    'response_time': 0.1  # TODO: measure actual time
                }
            else:
                return {
                    'status': 'error',
                    'message': 'Database query failed'
                }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Database connection failed: {str(e)}'
            }
    
    async def _check_redis(self) -> Dict[str, Any]:
        """Проверка подключения к Redis"""
        try:
            await asyncio.to_thread(self.redis_client.ping)
            return {
                'status': 'healthy',
                'message': 'Redis connection OK'
            }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Redis connection failed: {str(e)}'
            }
    
    async def _check_disk_space(self) -> Dict[str, Any]:
        """Проверка свободного места на диске"""
        try:
            disk_usage = psutil.disk_usage('/')
            percent_used = (disk_usage.used / disk_usage.total) * 100
            
            if percent_used > 90:
                return {
                    'status': 'error',
                    'message': f'Disk usage critical: {percent_used:.1f}%',
                    'usage_percent': percent_used
                }
            elif percent_used > 80:
                return {
                    'status': 'warning',
                    'message': f'Disk usage high: {percent_used:.1f}%',
                    'usage_percent': percent_used
                }
            else:
                return {
                    'status': 'healthy',
                    'message': f'Disk usage normal: {percent_used:.1f}%',
                    'usage_percent': percent_used
                }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Disk check failed: {str(e)}'
            }
    
    async def _check_memory(self) -> Dict[str, Any]:
        """Проверка использования памяти"""
        try:
            memory = psutil.virtual_memory()
            percent_used = memory.percent
            
            if percent_used > 90:
                return {
                    'status': 'error',
                    'message': f'Memory usage critical: {percent_used:.1f}%',
                    'usage_percent': percent_used
                }
            elif percent_used > 80:
                return {
                    'status': 'warning',
                    'message': f'Memory usage high: {percent_used:.1f}%',
                    'usage_percent': percent_used
                }
            else:
                return {
                    'status': 'healthy',
                    'message': f'Memory usage normal: {percent_used:.1f}%',
                    'usage_percent': percent_used
                }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Memory check failed: {str(e)}'
            }
    
    async def _check_cpu(self) -> Dict[str, Any]:
        """Проверка загрузки CPU"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            
            if cpu_percent > 90:
                return {
                    'status': 'error',
                    'message': f'CPU usage critical: {cpu_percent:.1f}%',
                    'usage_percent': cpu_percent
                }
            elif cpu_percent > 80:
                return {
                    'status': 'warning',
                    'message': f'CPU usage high: {cpu_percent:.1f}%',
                    'usage_percent': cpu_percent
                }
            else:
                return {
                    'status': 'healthy',
                    'message': f'CPU usage normal: {cpu_percent:.1f}%',
                    'usage_percent': cpu_percent
                }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'CPU check failed: {str(e)}'
            }
    
    async def _check_response_time(self) -> Dict[str, Any]:
        """Проверка времени ответа API"""
        try:
            start_time = time.time()
            
            # Делаем тестовый запрос к API
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{settings.API_V1_STR}/flowers/?limit=1") as response:
                    if response.status == 200:
                        response_time = (time.time() - start_time) * 1000  # в миллисекундах
                        
                        if response_time > 5000:  # 5 секунд
                            return {
                                'status': 'error',
                                'message': f'API response time critical: {response_time:.0f}ms',
                                'response_time': response_time
                            }
                        elif response_time > 2000:  # 2 секунды
                            return {
                                'status': 'warning',
                                'message': f'API response time high: {response_time:.0f}ms',
                                'response_time': response_time
                            }
                        else:
                            return {
                                'status': 'healthy',
                                'message': f'API response time normal: {response_time:.0f}ms',
                                'response_time': response_time
                            }
                    else:
                        return {
                            'status': 'error',
                            'message': f'API returned status {response.status}'
                        }
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Response time check failed: {str(e)}'
            }

class MetricsCollector:
    """Сбор метрик системы"""
    
    def __init__(self):
        self.redis_client = redis_client
    
    async def collect_metrics(self) -> SystemMetrics:
        """Собирает текущие метрики системы"""
        try:
            # Системные метрики
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Метрики из Redis
            active_connections = await self._get_active_connections()
            response_time_avg = await self._get_avg_response_time()
            error_rate = await self._get_error_rate()
            requests_per_minute = await self._get_requests_per_minute()
            
            return SystemMetrics(
                timestamp=datetime.utcnow(),
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                disk_percent=(disk.used / disk.total) * 100,
                active_connections=active_connections,
                response_time_avg=response_time_avg,
                error_rate=error_rate,
                requests_per_minute=requests_per_minute
            )
        except Exception as e:
            logger.error(f"Failed to collect metrics: {e}")
            return SystemMetrics(
                timestamp=datetime.utcnow(),
                cpu_percent=0,
                memory_percent=0,
                disk_percent=0,
                active_connections=0,
                response_time_avg=0,
                error_rate=0,
                requests_per_minute=0
            )
    
    async def _get_active_connections(self) -> int:
        """Получает количество активных подключений"""
        try:
            # Подсчитываем активные сессии в Redis
            pattern = "session:*"
            keys = await asyncio.to_thread(self.redis_client.keys, pattern)
            return len(keys)
        except:
            return 0
    
    async def _get_avg_response_time(self) -> float:
        """Получает среднее время ответа за последние 5 минут"""
        try:
            key = "metrics:response_times"
            times = await asyncio.to_thread(self.redis_client.lrange, key, 0, -1)
            if times:
                avg_time = sum(float(t) for t in times) / len(times)
                return avg_time
            return 0.0
        except:
            return 0.0
    
    async def _get_error_rate(self) -> float:
        """Получает процент ошибок за последние 5 минут"""
        try:
            total_key = "metrics:requests_total"
            error_key = "metrics:requests_errors"
            
            total = await asyncio.to_thread(self.redis_client.get, total_key)
            errors = await asyncio.to_thread(self.redis_client.get, error_key)
            
            if total and int(total) > 0:
                error_rate = (int(errors or 0) / int(total)) * 100
                return error_rate
            return 0.0
        except:
            return 0.0
    
    async def _get_requests_per_minute(self) -> int:
        """Получает количество запросов в минуту"""
        try:
            key = "metrics:requests_per_minute"
            rpm = await asyncio.to_thread(self.redis_client.get, key)
            return int(rpm) if rpm else 0
        except:
            return 0

class AlertManager:
    """Управление алертами"""
    
    def __init__(self):
        self.redis_client = redis_client
        self.alerts_key = "alerts:active"
        
    async def create_alert(
        self,
        level: AlertLevel,
        title: str,
        message: str,
        source: str
    ) -> Alert:
        """Создает новый алерт"""
        alert_id = f"{source}:{int(time.time())}"
        alert = Alert(
            id=alert_id,
            level=level,
            title=title,
            message=message,
            timestamp=datetime.utcnow(),
            source=source
        )
        
        # Сохраняем в Redis
        await asyncio.to_thread(
            self.redis_client.hset,
            self.alerts_key,
            alert_id,
            str(asdict(alert))
        )
        
        # Отправляем уведомление
        await self._send_alert_notification(alert)
        
        logger.warning(f"Alert created: {alert.title} - {alert.message}")
        return alert
    
    async def resolve_alert(self, alert_id: str) -> bool:
        """Разрешает алерт"""
        try:
            alert_data = await asyncio.to_thread(
                self.redis_client.hget,
                self.alerts_key,
                alert_id
            )
            
            if alert_data:
                # Помечаем как разрешенный
                await asyncio.to_thread(
                    self.redis_client.hdel,
                    self.alerts_key,
                    alert_id
                )
                
                # Сохраняем в историю
                await asyncio.to_thread(
                    self.redis_client.hset,
                    "alerts:resolved",
                    alert_id,
                    alert_data
                )
                
                logger.info(f"Alert resolved: {alert_id}")
                return True
        except Exception as e:
            logger.error(f"Failed to resolve alert {alert_id}: {e}")
        
        return False
    
    async def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Получает список активных алертов"""
        try:
            alerts_data = await asyncio.to_thread(
                self.redis_client.hgetall,
                self.alerts_key
            )
            
            alerts = []
            for alert_id, alert_data in alerts_data.items():
                try:
                    alert_dict = eval(alert_data)  # Небезопасно, но для прототипа
                    alerts.append(alert_dict)
                except:
                    continue
            
            return sorted(alerts, key=lambda x: x['timestamp'], reverse=True)
        except Exception as e:
            logger.error(f"Failed to get active alerts: {e}")
            return []
    
    async def _send_alert_notification(self, alert: Alert):
        """Отправляет уведомление об алерте"""
        try:
            # Отправляем в Telegram (если критический)
            if alert.level in [AlertLevel.ERROR, AlertLevel.CRITICAL]:
                await self._send_telegram_alert(alert)
            
            # Логируем в зависимости от уровня
            if alert.level == AlertLevel.CRITICAL:
                logger.critical(f"CRITICAL ALERT: {alert.title} - {alert.message}")
            elif alert.level == AlertLevel.ERROR:
                logger.error(f"ERROR ALERT: {alert.title} - {alert.message}")
            elif alert.level == AlertLevel.WARNING:
                logger.warning(f"WARNING ALERT: {alert.title} - {alert.message}")
            else:
                logger.info(f"INFO ALERT: {alert.title} - {alert.message}")
                
        except Exception as e:
            logger.error(f"Failed to send alert notification: {e}")
    
    async def _send_telegram_alert(self, alert: Alert):
        """Отправляет алерт в Telegram"""
        try:
            if not settings.TELEGRAM_BOT_TOKEN:
                return
            
            # Формируем сообщение
            emoji = {
                AlertLevel.CRITICAL: "🚨",
                AlertLevel.ERROR: "❌",
                AlertLevel.WARNING: "⚠️",
                AlertLevel.INFO: "ℹ️"
            }
            
            message = f"{emoji[alert.level]} *{alert.title}*\n\n"
            message += f"📝 {alert.message}\n"
            message += f"🕒 {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}\n"
            message += f"📍 Source: {alert.source}"
            
            # Отправляем админам (здесь нужно получить список админов)
            # Для примера отправляем в канал логов
            admin_chat_id = settings.ADMIN_TELEGRAM_CHAT_ID  # Нужно добавить в настройки
            
            if admin_chat_id:
                url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
                data = {
                    "chat_id": admin_chat_id,
                    "text": message,
                    "parse_mode": "Markdown"
                }
                
                async with aiohttp.ClientSession() as session:
                    await session.post(url, json=data)
                    
        except Exception as e:
            logger.error(f"Failed to send Telegram alert: {e}")

# Глобальные экземпляры
health_checker = HealthChecker()
metrics_collector = MetricsCollector()
alert_manager = AlertManager()

# Middleware для сбора метрик запросов
class MetricsMiddleware:
    """Middleware для сбора метрик HTTP запросов"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        start_time = time.time()
        
        # Обертываем send для перехвата статуса ответа
        status_code = 200
        
        async def send_wrapper(message):
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            # Записываем метрики
            response_time = (time.time() - start_time) * 1000
            await self._record_metrics(response_time, status_code)
    
    async def _record_metrics(self, response_time: float, status_code: int):
        """Записывает метрики запроса"""
        try:
            # Время ответа
            await asyncio.to_thread(
                redis_client.lpush,
                "metrics:response_times",
                response_time
            )
            await asyncio.to_thread(
                redis_client.ltrim,
                "metrics:response_times",
                0, 999  # Храним последние 1000 значений
            )
            
            # Счетчики запросов
            await asyncio.to_thread(redis_client.incr, "metrics:requests_total")
            
            if status_code >= 400:
                await asyncio.to_thread(redis_client.incr, "metrics:requests_errors")
            
            # Запросы в минуту (с TTL)
            minute_key = f"metrics:rpm:{int(time.time() // 60)}"
            await asyncio.to_thread(redis_client.incr, minute_key)
            await asyncio.to_thread(redis_client.expire, minute_key, 300)  # 5 минут
            
        except Exception as e:
            logger.error(f"Failed to record metrics: {e}")

# Функции для использования в приложении
async def get_system_health() -> Dict[str, Any]:
    """Получает состояние системы"""
    return await health_checker.run_health_checks()

async def get_system_metrics() -> SystemMetrics:
    """Получает текущие метрики системы"""
    return await metrics_collector.collect_metrics()

async def create_alert(level: AlertLevel, title: str, message: str, source: str) -> Alert:
    """Создает алерт"""
    return await alert_manager.create_alert(level, title, message, source) 