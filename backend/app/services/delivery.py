import aiohttp
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class YandexDeliveryService:
    """Сервис для работы с API Яндекс.Доставки"""
    
    def __init__(self):
        self.base_url = "https://b2b.taxi.yandex.net/b2b/cargo/integration/v2"
        self.token = settings.YANDEX_DELIVERY_TOKEN
        self.client_id = settings.YANDEX_DELIVERY_CLIENT_ID
        
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict] = None,
        headers: Optional[Dict] = None
    ) -> Dict:
        """Базовый метод для выполнения запросов к API"""
        
        url = f"{self.base_url}{endpoint}"
        default_headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        if headers:
            default_headers.update(headers)
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(
                    method=method,
                    url=url,
                    json=data,
                    headers=default_headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    response_data = await response.json()
                    
                    if response.status >= 400:
                        logger.error(f"Yandex Delivery API error: {response.status} - {response_data}")
                        raise Exception(f"API Error: {response_data.get('message', 'Unknown error')}")
                    
                    return response_data
                    
        except aiohttp.ClientError as e:
            logger.error(f"Network error calling Yandex Delivery API: {e}")
            raise Exception(f"Network error: {str(e)}")
    
    async def calculate_delivery_price(
        self,
        pickup_address: str,
        delivery_address: str,
        items_count: int = 1,
        items_weight: float = 1.0
    ) -> Dict[str, Any]:
        """Расчет стоимости доставки"""
        
        data = {
            "route_points": [
                {
                    "coordinates": await self._geocode_address(pickup_address),
                    "fullname": pickup_address,
                    "type": "source"
                },
                {
                    "coordinates": await self._geocode_address(delivery_address),
                    "fullname": delivery_address,
                    "type": "destination"
                }
            ],
            "items": [
                {
                    "quantity": items_count,
                    "size": {"length": 0.3, "width": 0.3, "height": 0.3},
                    "weight": items_weight,
                    "cost_value": "1000",
                    "cost_currency": "RUB",
                    "title": "Цветы",
                    "category": "flowers"
                }
            ],
            "skip_client_notify": True
        }
        
        response = await self._make_request("POST", "/estimate", data)
        
        return {
            "price": response["price"],
            "currency": response["currency_rules"]["code"],
            "eta_min": response["eta_min"],
            "eta_max": response["eta_max"],
            "distance_meters": response.get("distance_meters", 0)
        }
    
    async def create_delivery_order(
        self,
        order_id: str,
        pickup_address: str,
        pickup_phone: str,
        pickup_comment: str,
        delivery_address: str,
        delivery_phone: str,
        delivery_comment: str,
        recipient_name: str,
        items: List[Dict],
        delivery_interval: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Создание заказа доставки"""
        
        # Подготовка данных для API
        route_points = [
            {
                "coordinates": await self._geocode_address(pickup_address),
                "fullname": pickup_address,
                "type": "source",
                "contact": {
                    "phone": pickup_phone
                },
                "skip_confirmation": True,
                "comment": pickup_comment
            },
            {
                "coordinates": await self._geocode_address(delivery_address),
                "fullname": delivery_address,
                "type": "destination",
                "contact": {
                    "phone": delivery_phone,
                    "name": recipient_name
                },
                "comment": delivery_comment
            }
        ]
        
        # Добавляем временной интервал если указан
        if delivery_interval:
            route_points[1]["visit_order"] = 2
            route_points[1]["pickup_code"] = order_id[-4:]  # Последние 4 цифры заказа как код
            route_points[1]["visit_interval"] = delivery_interval
        
        # Подготовка списока товаров
        api_items = []
        total_weight = 0
        total_cost = 0
        
        for item in items:
            weight = item.get("weight", 0.5)  # Стандартный вес цветов
            cost = item.get("price", 0)
            
            api_items.append({
                "quantity": item["quantity"],
                "size": {"length": 0.3, "width": 0.3, "height": 0.3},
                "weight": weight,
                "cost_value": str(cost),
                "cost_currency": "RUB",
                "title": item["name"],
                "category": "flowers"
            })
            
            total_weight += weight * item["quantity"]
            total_cost += cost * item["quantity"]
        
        data = {
            "route_points": route_points,
            "items": api_items,
            "comment": f"Заказ цветов #{order_id}",
            "optional_return": False,
            "skip_client_notify": False,
            "skip_emergency_notify": False,
            "client_requirements": {
                "taxi_class": "express"
            }
        }
        
        response = await self._make_request("POST", "/claims/create", data)
        
        return {
            "claim_id": response["id"],
            "status": response["status"],
            "version": response["version"],
            "created_ts": response["created_ts"],
            "price": response.get("pricing", {}).get("offer", {}).get("price", "0"),
            "eta_min": response.get("eta_min", 0),
            "eta_max": response.get("eta_max", 0)
        }
    
    async def get_delivery_status(self, claim_id: str) -> Dict[str, Any]:
        """Получение статуса доставки"""
        
        response = await self._make_request("GET", f"/claims/info?claim_id={claim_id}")
        
        # Маппинг статусов Яндекса на наши
        status_mapping = {
            "new": "created",
            "processing": "processing", 
            "pickup_arrived": "pickup_arrived",
            "ready_for_pickup_confirmation": "ready_for_pickup",
            "pickuped": "picked_up",
            "delivery_arrived": "delivery_arrived",
            "ready_for_delivery_confirmation": "ready_for_delivery",
            "delivered": "delivered",
            "cancelled": "cancelled",
            "failed": "failed"
        }
        
        yandex_status = response["status"]
        our_status = status_mapping.get(yandex_status, yandex_status)
        
        result = {
            "claim_id": claim_id,
            "status": our_status,
            "yandex_status": yandex_status,
            "version": response["version"],
            "updated_ts": response.get("updated_ts"),
            "route_points": response.get("route_points", [])
        }
        
        # Добавляем информацию о курьере если доступна
        if "performer_info" in response:
            performer = response["performer_info"]
            result["courier_info"] = {
                "name": performer.get("courier_name"),
                "phone": performer.get("courier_phone"),
                "transport_type": performer.get("transport_type")
            }
        
        return result
    
    async def cancel_delivery(self, claim_id: str, reason: str = "Отмена заказа") -> bool:
        """Отмена доставки"""
        
        data = {
            "version": await self._get_claim_version(claim_id),
            "cancel_comment": reason
        }
        
        try:
            await self._make_request("POST", f"/claims/cancel?claim_id={claim_id}", data)
            return True
        except Exception as e:
            logger.error(f"Failed to cancel delivery {claim_id}: {e}")
            return False
    
    async def get_delivery_intervals(
        self, 
        pickup_address: str,
        delivery_address: str,
        date: datetime = None
    ) -> List[Dict]:
        """Получение доступных временных интервалов доставки"""
        
        if not date:
            date = datetime.now() + timedelta(hours=2)  # Минимум через 2 часа
        
        # Яндекс предоставляет стандартные интервалы
        intervals = [
            {
                "from": "09:00",
                "to": "12:00", 
                "type": "morning",
                "label": "Утром (9:00-12:00)"
            },
            {
                "from": "12:00", 
                "to": "18:00",
                "type": "afternoon", 
                "label": "Днем (12:00-18:00)"
            },
            {
                "from": "18:00",
                "to": "21:00",
                "type": "evening",
                "label": "Вечером (18:00-21:00)"
            }
        ]
        
        # Конвертируем в формат API
        api_intervals = []
        for interval in intervals:
            from_dt = datetime.combine(date.date(), datetime.strptime(interval["from"], "%H:%M").time())
            to_dt = datetime.combine(date.date(), datetime.strptime(interval["to"], "%H:%M").time())
            
            api_intervals.append({
                "from": from_dt.isoformat(),
                "to": to_dt.isoformat(),
                "type": interval["type"],
                "label": interval["label"]
            })
        
        return api_intervals
    
    async def _geocode_address(self, address: str) -> List[float]:
        """Геокодирование адреса"""
        
        # Простая реализация для Москвы - в реальности использовать Yandex Geocoder API
        # Пока возвращаем координаты центра Москвы
        moscow_coords = [37.617698, 55.755864]
        
        # TODO: Интеграция с Yandex Geocoder API для точного определения координат
        # https://yandex.ru/dev/maps/geocoder/
        
        return moscow_coords
    
    async def _get_claim_version(self, claim_id: str) -> int:
        """Получение актуальной версии заказа"""
        
        info = await self.get_delivery_status(claim_id)
        return info["version"]


# Singleton instance
delivery_service = YandexDeliveryService() 