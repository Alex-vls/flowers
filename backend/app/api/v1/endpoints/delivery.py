from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session
from datetime import datetime, date

from app.core.database import get_db
from app.api.v1.deps import get_current_active_user, get_current_admin_user
from app.models.user import User
from app.models.order import Order
from app.services.delivery import delivery_service
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/calculate-price")
async def calculate_delivery_price(
    delivery_address: str,
    items_count: int = 1,
    items_weight: float = 1.0,
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Расчет стоимости доставки"""
    
    try:
        result = await delivery_service.calculate_delivery_price(
            pickup_address=settings.YANDEX_PICKUP_ADDRESS,
            delivery_address=delivery_address,
            items_count=items_count,
            items_weight=items_weight
        )
        
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Failed to calculate delivery price: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Не удалось рассчитать стоимость доставки: {str(e)}"
        )


@router.get("/intervals")
async def get_delivery_intervals(
    delivery_address: str,
    delivery_date: date = None,
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Получение доступных временных интервалов доставки"""
    
    try:
        target_date = datetime.combine(delivery_date, datetime.min.time()) if delivery_date else None
        
        intervals = await delivery_service.get_delivery_intervals(
            pickup_address=settings.YANDEX_PICKUP_ADDRESS,
            delivery_address=delivery_address,
            date=target_date
        )
        
        return {
            "success": True,
            "data": {
                "intervals": intervals,
                "date": delivery_date.isoformat() if delivery_date else None
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to get delivery intervals: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Не удалось получить интервалы доставки: {str(e)}"
        )


@router.post("/create-order")
async def create_delivery_order(
    order_id: int,
    delivery_interval: Dict = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """Создание заказа доставки"""
    
    # Получаем заказ из базы данных
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == current_user.id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заказ не найден"
        )
    
    # Проверяем что заказ подтвержден
    if order.status != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Заказ должен быть подтвержден для создания доставки"
        )
    
    try:
        # Подготавливаем данные для API
        items = []
        for order_item in order.items:
            items.append({
                "name": order_item.flower.name,
                "quantity": order_item.quantity,
                "price": float(order_item.flower.price),
                "weight": 0.5  # Стандартный вес цветов
            })
        
        # Создаем заказ в Яндекс.Доставке
        delivery_result = await delivery_service.create_delivery_order(
            order_id=order.order_number,
            pickup_address=settings.YANDEX_PICKUP_ADDRESS,
            pickup_phone=settings.YANDEX_PICKUP_PHONE,
            pickup_comment=f"Заказ цветов #{order.order_number}",
            delivery_address=order.delivery_address,
            delivery_phone=current_user.phone or "+7(999)000-00-00",
            delivery_comment=order.delivery_instructions or "",
            recipient_name=current_user.full_name or "Получатель",
            items=items,
            delivery_interval=delivery_interval
        )
        
        # Обновляем заказ в базе данных
        order.delivery_claim_id = delivery_result["claim_id"]
        order.delivery_status = delivery_result["status"]
        order.status = "delivering"
        
        db.commit()
        db.refresh(order)
        
        # Запускаем фоновую задачу для отслеживания статуса
        background_tasks.add_task(track_delivery_status, delivery_result["claim_id"], order_id, db)
        
        return {
            "success": True,
            "data": {
                "claim_id": delivery_result["claim_id"],
                "status": delivery_result["status"],
                "estimated_time": f"{delivery_result['eta_min']}-{delivery_result['eta_max']} мин",
                "price": delivery_result["price"]
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to create delivery order: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Не удалось создать заказ доставки: {str(e)}"
        )


@router.get("/status/{claim_id}")
async def get_delivery_status(
    claim_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Получение статуса доставки"""
    
    # Проверяем что заказ принадлежит пользователю
    order = db.query(Order).filter(
        Order.delivery_claim_id == claim_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заказ доставки не найден"
        )
    
    try:
        status_info = await delivery_service.get_delivery_status(claim_id)
        
        return {
            "success": True,
            "data": status_info
        }
        
    except Exception as e:
        logger.error(f"Failed to get delivery status: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Не удалось получить статус доставки: {str(e)}"
        )


@router.post("/cancel/{claim_id}")
async def cancel_delivery(
    claim_id: str,
    reason: str = "Отмена заказа по требованию клиента",
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Отмена доставки"""
    
    # Проверяем что заказ принадлежит пользователю
    order = db.query(Order).filter(
        Order.delivery_claim_id == claim_id,
        Order.user_id == current_user.id
    ).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заказ доставки не найден"
        )
    
    try:
        success = await delivery_service.cancel_delivery(claim_id, reason)
        
        if success:
            # Обновляем статус заказа
            order.delivery_status = "cancelled"
            order.status = "cancelled"
            db.commit()
            
            return {
                "success": True,
                "message": "Доставка отменена"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Не удалось отменить доставку"
            )
            
    except Exception as e:
        logger.error(f"Failed to cancel delivery: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ошибка отмены доставки: {str(e)}"
        )


@router.post("/webhook")
async def delivery_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Webhook для получения обновлений статуса доставки от Яндекса"""
    
    try:
        data = await request.json()
        claim_id = data.get("claim_id")
        status = data.get("status")
        
        if not claim_id or not status:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Некорректные данные webhook"
            )
        
        # Находим заказ по claim_id
        order = db.query(Order).filter(Order.delivery_claim_id == claim_id).first()
        if not order:
            logger.warning(f"Order with claim_id {claim_id} not found")
            return {"success": True, "message": "Order not found"}
        
        # Обновляем статус доставки
        order.delivery_status = status
        
        # Маппинг статусов доставки на статусы заказа
        status_mapping = {
            "delivered": "delivered",
            "cancelled": "cancelled",
            "failed": "cancelled"
        }
        
        if status in status_mapping:
            order.status = status_mapping[status]
            
            # Если доставлен - обновляем дату доставки
            if status == "delivered":
                order.delivered_at = datetime.now()
        
        db.commit()
        
        # Отправляем уведомление пользователю в фоне
        background_tasks.add_task(send_delivery_notification, order.user_id, order.id, status)
        
        logger.info(f"Updated delivery status for order {order.id}: {status}")
        
        return {
            "success": True,
            "message": "Status updated"
        }
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing error"
        )


# Admin endpoints
@router.get("/admin/orders")
async def get_delivery_orders(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Получение списка заказов доставки для админа"""
    
    query = db.query(Order).filter(Order.delivery_claim_id.isnot(None))
    
    if status:
        query = query.filter(Order.delivery_status == status)
    
    orders = query.offset(skip).limit(limit).all()
    
    return {
        "success": True,
        "data": [
            {
                "id": order.id,
                "order_number": order.order_number,
                "claim_id": order.delivery_claim_id,
                "status": order.delivery_status,
                "delivery_address": order.delivery_address,
                "created_at": order.created_at.isoformat(),
                "user_name": order.user.full_name,
                "user_phone": order.user.phone
            }
            for order in orders
        ]
    }


@router.post("/admin/refresh-status/{claim_id}")
async def refresh_delivery_status(
    claim_id: str,
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Принудительное обновление статуса доставки (админ)"""
    
    order = db.query(Order).filter(Order.delivery_claim_id == claim_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заказ не найден"
        )
    
    try:
        status_info = await delivery_service.get_delivery_status(claim_id)
        
        # Обновляем статус в базе
        order.delivery_status = status_info["status"]
        db.commit()
        
        return {
            "success": True,
            "data": status_info
        }
        
    except Exception as e:
        logger.error(f"Failed to refresh delivery status: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ошибка обновления статуса: {str(e)}"
        )


# Background tasks
async def track_delivery_status(claim_id: str, order_id: int, db: Session):
    """Фоновая задача для отслеживания статуса доставки"""
    
    import asyncio
    
    try:
        # Отслеживаем статус каждые 5 минут
        while True:
            await asyncio.sleep(300)  # 5 минут
            
            try:
                status_info = await delivery_service.get_delivery_status(claim_id)
                
                order = db.query(Order).filter(Order.id == order_id).first()
                if order:
                    old_status = order.delivery_status
                    order.delivery_status = status_info["status"]
                    
                    if old_status != status_info["status"]:
                        db.commit()
                        logger.info(f"Delivery status updated for order {order_id}: {status_info['status']}")
                        
                        # Отправляем уведомление пользователю
                        await send_delivery_notification(order.user_id, order_id, status_info["status"])
                    
                    # Останавливаем отслеживание если доставка завершена
                    if status_info["status"] in ["delivered", "cancelled", "failed"]:
                        break
                        
            except Exception as e:
                logger.error(f"Error tracking delivery status: {e}")
                
    except Exception as e:
        logger.error(f"Background task error: {e}")


async def send_delivery_notification(user_id: int, order_id: int, status: str):
    """Отправка уведомления пользователю об изменении статуса доставки"""
    
    # TODO: Интеграция с системой уведомлений
    # Можно отправлять через Telegram, email, push-уведомления
    
    status_messages = {
        "processing": "Заказ передан курьеру",
        "pickup_arrived": "Курьер прибыл за заказом",
        "picked_up": "Заказ забран курьером",
        "delivery_arrived": "Курьер прибыл по адресу доставки",
        "delivered": "Заказ доставлен",
        "cancelled": "Доставка отменена",
        "failed": "Ошибка доставки"
    }
    
    message = status_messages.get(status, f"Статус доставки изменен: {status}")
    
    logger.info(f"Delivery notification for user {user_id}, order {order_id}: {message}") 