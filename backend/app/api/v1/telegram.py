from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import httpx
import json
import logging
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.flower import Flower
from app.models.subscription import Subscription
from app.models.order import Order
from app.crud.crud_user import crud_user
from app.crud.crud_flower import crud_flower
from app.crud.crud_subscription import crud_subscription
from app.crud.crud_order import crud_order
from app.schemas.telegram import TelegramUpdate, TelegramMessage, TelegramInlineKeyboard

router = APIRouter()
logger = logging.getLogger(__name__)

class TelegramBot:
    def __init__(self):
        self.token = settings.TELEGRAM_BOT_TOKEN
        self.api_url = f"https://api.telegram.org/bot{self.token}"
    
    async def send_message(self, chat_id: int, text: str, reply_markup: Optional[dict] = None):
        """Отправить сообщение в Telegram"""
        async with httpx.AsyncClient() as client:
            payload = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML"
            }
            if reply_markup:
                payload["reply_markup"] = reply_markup
            
            response = await client.post(f"{self.api_url}/sendMessage", json=payload)
            return response.json()
    
    async def send_photo(self, chat_id: int, photo: str, caption: str = "", reply_markup: Optional[dict] = None):
        """Отправить фото в Telegram"""
        async with httpx.AsyncClient() as client:
            payload = {
                "chat_id": chat_id,
                "photo": photo,
                "caption": caption,
                "parse_mode": "HTML"
            }
            if reply_markup:
                payload["reply_markup"] = reply_markup
            
            response = await client.post(f"{self.api_url}/sendPhoto", json=payload)
            return response.json()
    
    async def answer_callback_query(self, callback_query_id: str, text: str = "", show_alert: bool = False):
        """Ответить на callback query"""
        async with httpx.AsyncClient() as client:
            payload = {
                "callback_query_id": callback_query_id,
                "text": text,
                "show_alert": show_alert
            }
            response = await client.post(f"{self.api_url}/answerCallbackQuery", json=payload)
            return response.json()
    
    async def set_webhook(self, url: str):
        """Установить webhook"""
        async with httpx.AsyncClient() as client:
            payload = {"url": url}
            response = await client.post(f"{self.api_url}/setWebhook", json=payload)
            return response.json()

bot = TelegramBot()

async def send_welcome_message_on_login(user: User, is_new_user: bool = False):
    """Отправить приветственное сообщение при авторизации на сайте"""
    if not user.telegram_id:
        logger.info(f"User {user.id} has no telegram_id, skipping welcome message")
        return
    
    try:
        if is_new_user:
            welcome_text = f"""
🌸 <b>Добро пожаловать, {user.full_name}!</b> 🌸

🎉 <b>Поздравляем с регистрацией в MSK Flower!</b>

Вы стали частью нашего punk rock сообщества любителей цветов!

<b>Что вас ждет:</b>
• 🌹 Свежие цветы каждый день
• 📅 Гибкие подписки на доставку
• 📦 Быстрое оформление заказов
• 💳 Бонусная система и скидки
• 🔔 Персональные уведомления

Ваш стартовый баланс: <b>{user.bonus_points} бонусных баллов</b>

<i>Начните с просмотра каталога! 👇</i>
            """
        else:
            welcome_text = f"""
🌸 <b>С возвращением, {user.full_name}!</b> 🌸

Вы успешно авторизовались на сайте MSK Flower!

Рады видеть вас снова в нашем punk rock мире цветов! 🎸

<b>Ваш текущий статус:</b>
• 💳 Бонусный баланс: <b>{user.bonus_points} баллов</b>
• 🔔 Уведомления: активны
• 🚀 Готовы к новым заказам!

<i>Продолжайте делать мир ярче! 👇</i>
            """
        
        # Создать кнопку "Открыть магазин"
        reply_markup = {
            "inline_keyboard": [
                [
                    {
                        "text": "🌺 Открыть магазин",
                        "url": "https://msk-flower.su"
                    }
                ],
                [
                    {
                        "text": "🌹 Каталог",
                        "url": "https://msk-flower.su/catalog"
                    },
                    {
                        "text": "👤 Профиль",
                        "url": "https://msk-flower.su/profile"
                    }
                ]
            ]
        }
        
        # Отправить сообщение
        result = await bot.send_message(
            chat_id=int(user.telegram_id),
            text=welcome_text,
            reply_markup=reply_markup
        )
        
        user_type = "new" if is_new_user else "existing"
        logger.info(f"Welcome message sent to {user_type} user {user.id} (telegram_id: {user.telegram_id})")
        return result
        
    except Exception as e:
        logger.error(f"Failed to send welcome message to user {user.id}: {e}")
        return None

def create_main_menu():
    """Создать главное меню"""
    return {
        "keyboard": [
            [{"text": "🌹 Каталог цветов"}],
            [{"text": "📅 Мои подписки"}, {"text": "📦 Мои заказы"}],
            [{"text": "👤 Профиль"}, {"text": "💳 Корзина"}],
            [{"text": "ℹ️ Помощь"}, {"text": "📞 Поддержка"}]
        ],
        "resize_keyboard": True,
        "one_time_keyboard": False
    }

def create_catalog_menu():
    """Создать меню каталога"""
    return {
        "inline_keyboard": [
            [
                {"text": "🌹 Розы", "callback_data": "catalog_roses"},
                {"text": "🌷 Тюльпаны", "callback_data": "catalog_tulips"}
            ],
            [
                {"text": "🌸 Лилии", "callback_data": "catalog_lilies"},
                {"text": "🌼 Хризантемы", "callback_data": "catalog_chrysanthemums"}
            ],
            [
                {"text": "🌺 Гвоздики", "callback_data": "catalog_carnations"},
                {"text": "💐 Смешанные", "callback_data": "catalog_mixed"}
            ],
            [
                {"text": "🍃 Сезонные", "callback_data": "catalog_seasonal"}
            ],
            [
                {"text": "🔙 Назад", "callback_data": "main_menu"}
            ]
        ]
    }

@router.post("/webhook")
async def telegram_webhook(request: Request):
    """Webhook для получения обновлений от Telegram"""
    try:
        data = await request.json()
        update = TelegramUpdate(**data)
        
        if update.message:
            await handle_message(update.message)
        elif update.callback_query:
            await handle_callback_query(update.callback_query)
        
        return JSONResponse(content={"ok": True})
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        return JSONResponse(content={"ok": False, "error": str(e)})

async def handle_message(message: TelegramMessage):
    """Обработать входящее сообщение"""
    from app.core.database import SessionLocal
    
    chat_id = message.chat.id
    text = message.text or ""
    
    # Получить сессию БД
    db = SessionLocal()
    try:
        # Проверить, зарегистрирован ли пользователь
        user = crud_user.get_by_telegram_id(db, str(chat_id))
        
        if not user:
            # Приветствие для новых пользователей
            welcome_text = """
🌸 <b>Добро пожаловать в MSK Flower!</b> 🌸

Мы доставляем свежие цветы каждый день прямо к вашему столу.

Для начала работы необходимо зарегистрироваться на сайте:
https://msk-flower.su/register

После регистрации свяжите ваш аккаунт с ботом, отправив команду:
/link <ваш_email>
            """
            await bot.send_message(chat_id, welcome_text, create_main_menu())
            return
        
        # Обработка команд
        if text.startswith("/"):
            await handle_command(message, user, db)
        else:
            await handle_text_message(message, user, db)
    finally:
        db.close()

async def handle_command(message: TelegramMessage, user: User, db: Session):
    """Обработать команды"""
    chat_id = message.chat.id
    text = message.text
    
    if text == "/start":
        welcome_text = f"""
🌸 <b>Привет, {user.full_name}!</b> 🌸

Добро пожаловать в MSK Flower Bot!

Выберите действие:
        """
        await bot.send_message(chat_id, welcome_text, create_main_menu())
    
    elif text == "/link":
        # Связать аккаунт с Telegram
        await bot.send_message(chat_id, "Для связи аккаунта отправьте ваш email в формате:\n/link your@email.com")
    
    elif text.startswith("/link "):
        email = text.split(" ", 1)[1]
        # Логика связывания аккаунта
        await bot.send_message(chat_id, f"Аккаунт {email} успешно связан с ботом!")
    
    elif text == "🌹 Каталог цветов":
        await show_catalog(message.chat.id)
    
    elif text == "📅 Мои подписки":
        await show_subscriptions(message.chat.id, user.id, db)
    
    elif text == "📦 Мои заказы":
        await show_orders(message.chat.id, user.id, db)
    
    elif text == "👤 Профиль":
        await show_profile(message.chat.id, user)
    
    elif text == "💳 Корзина":
        await show_cart(message.chat.id, user.id)
    
    elif text == "ℹ️ Помощь":
        await show_help(message.chat.id)
    
    elif text == "📞 Поддержка":
        support_text = """
📞 <b>Поддержка MSK Flower</b>

• Телефон: +7 (495) 123-45-67
• Email: info@msk-flower.su
• Telegram: @Flower_Moscow_appbot
• Сайт: https://msk-flower.su

Время работы: 8:00 - 22:00
        """
        await bot.send_message(chat_id, support_text)

async def handle_text_message(message: TelegramMessage, user: User, db: Session):
    """Обработать текстовые сообщения"""
    chat_id = message.chat.id
    text = message.text
    
    # Поиск цветов
    if "цветы" in text.lower() or "букет" in text.lower():
        await show_catalog(chat_id)
    else:
        await bot.send_message(chat_id, "Не понимаю команду. Используйте меню или отправьте /help для справки.")

async def handle_callback_query(callback_query):
    """Обработать callback query"""
    chat_id = callback_query.message.chat.id
    data = callback_query.data
    
    if data == "main_menu":
        await bot.send_message(chat_id, "Главное меню:", create_main_menu())
    
    elif data.startswith("catalog_"):
        category = data.split("_", 1)[1]
        await show_category_flowers(chat_id, category)
    
    elif data.startswith("flower_"):
        flower_id = int(data.split("_", 1)[1])
        await show_flower_details(chat_id, flower_id)
    
    elif data.startswith("add_to_cart_"):
        flower_id = int(data.split("_", 3)[3])
        await add_to_cart(chat_id, flower_id)
    
    # Ответить на callback query
    await bot.answer_callback_query(callback_query.id)

async def show_catalog(chat_id: int):
    """Показать каталог"""
    text = """
🌹 <b>Каталог цветов</b>

Выберите категорию:
    """
    await bot.send_message(chat_id, text, create_catalog_menu())

async def show_category_flowers(chat_id: int, category: str):
    """Показать цветы категории"""
    from app.core.database import SessionLocal
    
    db = SessionLocal()
    try:
        flowers = crud_flower.get_by_category(db, category, limit=5)
        
        if not flowers:
            await bot.send_message(chat_id, "В этой категории пока нет цветов.")
            return
        
        text = f"🌹 <b>Цветы в категории '{category}'</b>\n\n"
        
        keyboard = []
        for flower in flowers:
            text += f"• {flower.name} - {flower.price} ₽\n"
            keyboard.append([{
                "text": f"🌹 {flower.name}",
                "callback_data": f"flower_{flower.id}"
            }])
        
        keyboard.append([{"text": "🔙 Назад", "callback_data": "main_menu"}])
        
        await bot.send_message(chat_id, text, {"inline_keyboard": keyboard})
    finally:
        db.close()

async def show_flower_details(chat_id: int, flower_id: int):
    """Показать детали цветка"""
    from app.core.database import SessionLocal
    
    db = SessionLocal()
    try:
        flower = crud_flower.get(db, flower_id)
        if not flower:
            await bot.send_message(chat_id, "Цветок не найден.")
            return
        
        text = f"""
🌹 <b>{flower.name}</b>

{flower.description}

💰 Цена: {flower.price} ₽
📦 В наличии: {flower.stock_quantity} шт.
        """
        
        keyboard = {
            "inline_keyboard": [
                [{"text": "🛒 Добавить в корзину", "callback_data": f"add_to_cart_{flower_id}"}],
                [{"text": "🔙 Назад", "callback_data": "main_menu"}]
            ]
        }
        
        if flower.image_url:
            await bot.send_photo(chat_id, flower.image_url, text, keyboard)
        else:
            await bot.send_message(chat_id, text, keyboard)
    finally:
        db.close()

async def show_subscriptions(chat_id: int, user_id: int, db: Session):
    """Показать подписки пользователя"""
    subscriptions = crud_subscription.get_by_user(db, user_id)
    
    if not subscriptions:
        text = """
📅 <b>Мои подписки</b>

У вас пока нет активных подписок.

Создайте подписку на сайте:
https://msk-flower.su/subscription
        """
    else:
        text = "📅 <b>Мои подписки</b>\n\n"
        for sub in subscriptions:
            status_emoji = "🟢" if sub.status == "active" else "🟡" if sub.status == "paused" else "🔴"
            text += f"{status_emoji} {sub.name} - {sub.status}\n"
    
    await bot.send_message(chat_id, text)

async def show_orders(chat_id: int, user_id: int, db: Session):
    """Показать заказы пользователя"""
    orders = crud_order.get_by_user(db, user_id, limit=5)
    
    if not orders:
        text = """
📦 <b>Мои заказы</b>

У вас пока нет заказов.

Сделайте первый заказ:
https://msk-flower.su/catalog
        """
    else:
        text = "📦 <b>Мои заказы</b>\n\n"
        for order in orders:
            status_emoji = "🟢" if order.status == "delivered" else "🟡" if order.status == "delivering" else "🔴"
            text += f"{status_emoji} Заказ #{order.order_number} - {order.status}\n"
    
    await bot.send_message(chat_id, text)

async def show_profile(chat_id: int, user: User):
    """Показать профиль пользователя"""
    text = f"""
👤 <b>Профиль</b>

Имя: {user.full_name}
Email: {user.email}
Бонусные баллы: {user.bonus_points}
Подтвержден: {'✅' if user.is_verified else '❌'}

Редактировать профиль:
https://msk-flower.su/profile
    """
    await bot.send_message(chat_id, text)

async def show_cart(chat_id: int, user_id: int):
    """Показать корзину"""
    text = """
💳 <b>Корзина</b>

Для просмотра и оформления заказа перейдите на сайт:
https://msk-flower.su/cart
    """
    await bot.send_message(chat_id, text)

async def show_help(chat_id: int):
    """Показать справку"""
    text = """
ℹ️ <b>Помощь</b>

<b>Основные команды:</b>
/start - Главное меню
/link - Связать аккаунт
/help - Эта справка

<b>Как пользоваться:</b>
1. Зарегистрируйтесь на сайте
2. Свяжите аккаунт с ботом
3. Используйте меню для навигации

<b>Поддержка:</b>
@Flower_Moscow_appbot
    """
    await bot.send_message(chat_id, text)

async def add_to_cart(chat_id: int, flower_id: int):
    """Добавить цветок в корзину"""
    # Здесь должна быть логика добавления в корзину
    await bot.send_message(chat_id, "🌹 Цветок добавлен в корзину!\n\nПерейдите на сайт для оформления заказа: https://msk-flower.su/cart")

@router.post("/set-webhook")
async def set_webhook():
    """Установить webhook для бота"""
    try:
        result = await bot.set_webhook(settings.TELEGRAM_WEBHOOK_URL)
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/webhook-info")
async def get_webhook_info():
    """Получить информацию о webhook"""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{bot.api_url}/getWebhookInfo")
        return response.json() 