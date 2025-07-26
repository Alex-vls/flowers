# 🔧 Техническая документация MSK Flower

## 🏗️ Архитектура системы

**Микросервисная архитектура** на Docker с разделением frontend/backend.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx         │    │   Frontend      │    │   Backend       │
│   (Proxy)       │────│   (React)       │────│   (FastAPI)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                              │
         │              ┌─────────────────┐            │
         └──────────────│   PostgreSQL    │────────────┘
                        │   (Database)    │
                        └─────────────────┘
                                │
                        ┌─────────────────┐
                        │     Redis       │
                        │   (Cache)       │
                        └─────────────────┘
```

## 🛠️ Стек технологий

### Backend (Python)
- **FastAPI** - современный веб-фреймворк
- **SQLAlchemy** - ORM для работы с БД  
- **PostgreSQL** - основная база данных
- **Redis** - кэш и сессии
- **JWT** - аутентификация с Telegram интеграцией

### Frontend (TypeScript)
- **React 18** + **Vite** - быстрая сборка
- **Tailwind CSS** - utility-first CSS
- **Zustand** - легковесный state manager
- **React Query** - кэширование API запросов

### Infrastructure
- **Docker** + **docker-compose** - контейнеризация
- **Nginx** - reverse proxy, SSL termination
- **Let's Encrypt** - автоматические SSL сертификаты

## 📁 Файловая структура

```
flower/
├── backend/app/
│   ├── api/v1/endpoints/     # API маршруты
│   ├── models/               # SQLAlchemy модели
│   ├── schemas/              # Pydantic схемы
│   ├── core/                 # Конфигурация, security
│   └── services/             # Бизнес-логика
├── frontend/src/
│   ├── components/           # React компоненты
│   ├── pages/                # Страницы приложения
│   ├── hooks/                # Custom hooks
│   ├── store/                # Zustand stores
│   └── lib/                  # Утилиты, API клиент
├── docker/                   # Docker конфиги (nginx, postgres)
└── deploy/                   # Скрипты деплоя
```

## 🔐 Система авторизации

### Telegram Mini App
- Автоматическая авторизация через `window.Telegram.WebApp.initData`
- Валидация HMAC подписи от Telegram
- Создание JWT токенов для API доступа

### Website
- Telegram Login Widget для браузеров
- OAuth flow через `oauth.telegram.org`
- Та же JWT система для консистентности

### JWT Implementation
- **Access Token**: 24 часа, для API запросов
- **Refresh Token**: 30 дней, для обновления access токенов
- **Token Blacklisting**: Redis для отзыва токенов
- **User Caching**: Redis кэш пользователей

## 🛢️ База данных

### Основные таблицы
```sql
users           # Пользователи (email, telegram_id, role)
flowers         # Каталог цветов (name, price, category)  
orders          # Заказы (user_id, total, status)
subscriptions   # Подписки (user_id, frequency)
notifications   # Уведомления (user_id, type, content)
payments        # Платежи (order_id, amount, status)
reviews         # Отзывы (user_id, flower_id, rating)
bonuses         # Бонусная система (user_id, points)
```

### Миграции
- **Alembic** для версионирования схемы БД
- Автоматические миграции при деплое
- Тестовые данные в `docker/postgres/init.sql`

## 🚀 API Endpoints

### Authentication
```
POST /api/v1/auth/telegram-miniapp    # Telegram Mini App авторизация
POST /api/v1/auth/telegram-website    # Website Telegram авторизация  
POST /api/v1/auth/refresh             # Обновление токенов
POST /api/v1/auth/logout              # Выход (blacklist токена)
```

### Core Resources
```
GET    /api/v1/flowers                # Каталог цветов + фильтры
GET    /api/v1/flowers/{id}           # Детали цветка
POST   /api/v1/orders                 # Создание заказа
GET    /api/v1/orders                 # История заказов
GET    /api/v1/users/me               # Профиль пользователя
POST   /api/v1/subscriptions          # Управление подписками
```

### Admin Only  
```
GET    /api/v1/admin/dashboard        # Метрики и аналитика
POST   /api/v1/admin/flowers          # CRUD цветов
GET    /api/v1/admin/orders           # Все заказы системы
GET    /api/v1/admin/users            # Управление пользователями
```

## 🔄 Frontend архитектура

### Routing
- **React Router v6** - клиентская маршрутизация
- Автоматический редирект для Telegram Mini App (`/telegram`)
- Protected routes для админских страниц

### State Management
```typescript
// Zustand stores
authStore       # Аутентификация (user, tokens)
cartStore       # Корзина (items, total)
notificationStore  # Уведомления
```

### API Integration  
- **Axios** клиент с interceptors
- Автоматическое обновление токенов
- Error handling и retry логика
- **React Query** для серверного state

## 🐳 Docker конфигурация

### Services
```yaml
nginx:      # Reverse proxy, SSL termination
frontend:   # React app (статические файлы)  
backend:    # FastAPI приложение
postgres:   # База данных
redis:      # Кэш и сессии
```

### Volumes  
- `postgres_data` - данные БД
- `redis_data` - кэш Redis
- `ssl_certs` - SSL сертификаты

## 🚀 Деплой процесс

### Production деплой
```bash
# 1. Синхронизация кода
rsync -avz --delete . root@server:/opt/flower/

# 2. Пересборка и перезапуск
docker-compose down
docker-compose build --no-cache  
docker-compose up -d

# 3. Проверка здоровья
curl https://msk-flower.su/health
```

### Environment Variables
```bash
# Backend
SECRET_KEY=<jwt-secret>
DATABASE_URL=postgresql://...
REDIS_URL=redis://...  
TELEGRAM_BOT_TOKEN=<bot-token>

# Frontend  
VITE_API_URL=https://msk-flower.su/api
```

## 📊 Мониторинг и логи

### Logging
- **Structured JSON logs** для всех сервисов
- Детальное логирование auth flow
- Request/Response трассировка
- Error tracking с stack traces

### Health Checks
```bash
GET /health           # Общее здоровье системы
GET /api/v1/health    # Backend API status  
```

### Метрики (потенциальные)
- Response times по endpoint'ам
- Error rates и типы ошибок  
- Database connection pool
- Redis cache hit/miss rates

## 🔒 Безопасность

### Headers
- **CSP** - Content Security Policy для XSS защиты
- **HSTS** - принудительный HTTPS
- **X-Frame-Options** - защита от clickjacking

### Input validation
- **Pydantic** схемы для всех API inputs
- SQL injection защита через SQLAlchemy ORM
- Rate limiting на критических endpoint'ах

### Authentication security
- HMAC валидация Telegram данных
- Secure JWT токены с коротким TTL
- Token blacklisting для instant logout

---

**⚡ Готово к продакшену, масштабируемо, безопасно** 