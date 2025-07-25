# 🌸 MSK Flower - Сервис доставки цветов

Ежедневная доставка свежих цветов в Москве. Подписка на цветы для вашего стола.

## 🚀 Быстрый старт

### Требования
- Docker и Docker Compose
- Node.js 18+ (для разработки)
- Python 3.11+ (для разработки)

### Установка и запуск

1. **Клонирование репозитория**
```bash
git clone https://github.com/your-username/msk-flower.git
cd msk-flower
```

2. **Настройка переменных окружения**
```bash
cp .env.example .env
# Отредактируйте .env файл
```

3. **Запуск в Docker**
```bash
docker-compose up -d
```

4. **Применение миграций**
```bash
docker-compose exec backend alembic upgrade head
```

5. **Открыть в браузере**
- Сайт: http://localhost:3000
- API: http://localhost:8000/docs

## 🏗️ Архитектура

### Backend (FastAPI)
- **Python 3.11** + **FastAPI**
- **PostgreSQL** - основная база данных
- **Redis** - кэширование и сессии
- **SQLAlchemy** - ORM
- **Alembic** - миграции
- **JWT** - аутентификация
- **Pydantic** - валидация данных

### Frontend (React)
- **React 18** + **TypeScript**
- **Vite** - сборка
- **Tailwind CSS** - стили
- **Zustand** - state management
- **React Query** - кэширование API
- **React Router** - маршрутизация
- **Lucide React** - иконки

### Telegram Bot
- **Python Telegram Bot API**
- **Webhook** для получения обновлений
- **Inline кнопки** и **кастомные меню**
- **Интеграция с основным API**

### Telegram Mini App
- **React** приложение
- **Telegram WebApp API**
- **Адаптивный дизайн**
- **Haptic feedback**

## 📁 Структура проекта

```
msk-flower/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Конфигурация
│   │   ├── crud/           # CRUD операции
│   │   ├── models/         # SQLAlchemy модели
│   │   ├── schemas/        # Pydantic схемы
│   │   └── services/       # Бизнес-логика
│   ├── alembic/            # Миграции
│   └── requirements.txt
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React компоненты
│   │   ├── pages/          # Страницы
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # Сервисы
│   │   ├── store/          # Zustand store
│   │   └── types/          # TypeScript типы
│   └── package.json
├── deploy/                 # Скрипты деплоя
├── docker-compose.yml      # Docker конфигурация
└── README.md
```

## 🌐 Основные функции

### Для клиентов
- 📱 **Каталог цветов** с фильтрацией и поиском
- 📅 **Подписки** на ежедневную доставку
- 🛒 **Корзина** и оформление заказов
- 💳 **Онлайн оплата** через ЮMoney
- 📦 **Отслеживание заказов**
- 🎁 **Бонусная система** и реферальная программа
- 📱 **Telegram бот** для управления
- 🔔 **Уведомления** о статусе заказов

### Для администраторов
- 👨‍💼 **Админ-панель** для управления
- 📊 **Аналитика** и отчеты
- 📈 **Мониторинг** системы
- 🔧 **Управление контентом**
- 💰 **Финансовые отчеты**

## 🤖 Telegram Bot

### Команды
- `/start` - Главное меню
- `/link <email>` - Связать аккаунт
- `/help` - Справка

### Функции
- 🌹 Просмотр каталога цветов
- 📅 Управление подписками
- 📦 Отслеживание заказов
- 👤 Просмотр профиля
- 💳 Доступ к корзине

## 📱 Telegram Mini App

### Возможности
- 🏠 Главная страница с популярными цветами
- 🔗 Быстрые ссылки на основные разделы
- 📱 Адаптивный дизайн для мобильных устройств
- 🎯 Haptic feedback для лучшего UX

## 🚀 Деплой на VPS

### 1. Подготовка VPS
```bash
# Подключение к VPS
ssh root@109.238.92.204

# Запуск скрипта настройки
chmod +x deploy/setup-vps.sh
./deploy/setup-vps.sh
```

### 2. Копирование файлов
```bash
# Клонирование репозитория
git clone https://github.com/your-username/msk-flower.git /opt/msk-flower
cd /opt/msk-flower

# Настройка прав доступа
chown -R flower:flower /opt/msk-flower
```

### 3. Настройка переменных окружения
```bash
# Редактирование .env файла
nano .env

# Настройка SSL сертификата
certbot --nginx -d msk-flower.su
```

### 4. Запуск приложения
```bash
# Запуск в production
docker-compose -f docker-compose.prod.yml up -d

# Проверка статуса
docker-compose ps
docker-compose logs -f
```

## 🔧 Разработка

### Backend разработка
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate     # Windows

pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend разработка
```bash
cd frontend
npm install
npm run dev
```

### База данных
```bash
# Создание миграции
alembic revision --autogenerate -m "Description"

# Применение миграций
alembic upgrade head

# Откат миграции
alembic downgrade -1
```

## 📊 Мониторинг

### Логи
```bash
# Просмотр логов всех сервисов
docker-compose logs -f

# Логи конкретного сервиса
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Метрики
- **Prometheus** - сбор метрик
- **Grafana** - визуализация
- **ELK Stack** - логирование

### Здоровье системы
```bash
# Проверка здоровья API
curl http://localhost:8000/health

# Проверка базы данных
docker-compose exec postgres pg_isready -U flowersub
```

## 🔒 Безопасность

### SSL/TLS
- Автоматическое получение сертификатов через Let's Encrypt
- Принудительное перенаправление на HTTPS
- HSTS заголовки

### Firewall
- UFW для управления портами
- Fail2ban для защиты от атак
- Ограничение доступа к SSH

### Аутентификация
- JWT токены с коротким временем жизни
- Refresh токены для продления сессий
- Хеширование паролей с bcrypt

## 💾 Резервное копирование

### Автоматические бэкапы
```bash
# Ежедневные бэкапы в 2:00
0 2 * * * /opt/msk-flower/backup.sh

# Ручной бэкап
./backup.sh
```

### Восстановление
```bash
# Восстановление базы данных
docker-compose exec postgres psql -U flowersub -d flowersub < backup.sql

# Восстановление файлов
tar -xzf files_backup.tar.gz -C /opt/msk-flower/
```

## 📈 Масштабирование

### Горизонтальное масштабирование
```bash
# Масштабирование backend
docker-compose up -d --scale backend=3

# Масштабирование frontend
docker-compose up -d --scale frontend=2
```

### Load Balancer
- Nginx как reverse proxy
- Распределение нагрузки между инстансами
- Health checks для автоматического исключения неработающих сервисов

## 🐛 Отладка

### Логи разработки
```bash
# Backend логи
docker-compose logs -f backend

# Frontend логи
docker-compose logs -f frontend

# База данных
docker-compose logs -f postgres
```

### Отладка в IDE
- **VS Code** с Python и TypeScript расширениями
- **PyCharm** для Python разработки
- **WebStorm** для JavaScript/TypeScript

## 📝 API Документация

### Swagger UI
- Backend API: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Основные эндпоинты
- `GET /api/v1/flowers` - Список цветов
- `POST /api/v1/orders` - Создание заказа
- `GET /api/v1/subscriptions` - Подписки пользователя
- `POST /api/v1/telegram/webhook` - Telegram webhook

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - см. файл [LICENSE](LICENSE) для деталей.

## 📞 Поддержка

- 🌐 Сайт: https://msk-flower.su
- 🤖 Telegram: @Flower_Moscow_appbot
- 📧 Email: info@msk-flower.su
- 📱 Телефон: +7 (495) 123-45-67

## 🎯 Roadmap

### Версия 1.1
- [ ] Мобильное приложение (React Native)
- [ ] Интеграция с другими платежными системами
- [ ] Расширенная аналитика
- [ ] Система отзывов и рейтингов

### Версия 1.2
- [ ] AI рекомендации цветов
- [ ] Интеграция с CRM системами
- [ ] Мультиязычность
- [ ] Расширение зоны доставки

### Версия 2.0
- [ ] B2B портал для оптовых заказов
- [ ] Система управления складом
- [ ] Интеграция с поставщиками
- [ ] Расширенная система лояльности

---

**MSK Flower** - Ежедневная доставка свежих цветов в Москве 🌸 