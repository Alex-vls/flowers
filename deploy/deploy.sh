#!/bin/bash

# MSK Flower - Deploy Script

set -e

echo "🚀 Деплой MSK Flower..."

# Проверка переменных окружения
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    exit 1
fi

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker-compose down

# Удаление старых образов
echo "🧹 Очистка старых образов..."
docker system prune -f

# Сборка новых образов
echo "🔨 Сборка образов..."
docker-compose build --no-cache

# Создание и применение миграций
echo "🗄️ Применение миграций..."
docker-compose up -d postgres redis
sleep 10

# Ждем готовности базы данных
echo "⏳ Ожидание готовности базы данных..."
until docker-compose exec -T postgres pg_isready -U flowersub; do
    echo "База данных не готова, ждем..."
    sleep 2
done

# Применение миграций
docker-compose run --rm backend alembic upgrade head

# Запуск всех сервисов
echo "🚀 Запуск сервисов..."
docker-compose up -d

# Проверка статуса
echo "📊 Проверка статуса сервисов..."
sleep 10

# Проверка здоровья сервисов
echo "🏥 Проверка здоровья сервисов..."

# Backend
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend работает"
else
    echo "❌ Backend не отвечает"
    docker-compose logs backend
    exit 1
fi

# Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend работает"
else
    echo "❌ Frontend не отвечает"
    docker-compose logs frontend
    exit 1
fi

# Nginx
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Nginx работает"
else
    echo "❌ Nginx не отвечает"
    docker-compose logs nginx
    exit 1
fi

# Проверка SSL
if curl -f https://msk-flower.su > /dev/null 2>&1; then
    echo "✅ SSL сертификат работает"
else
    echo "⚠️ SSL сертификат не настроен"
fi

# Настройка Telegram webhook
echo "🤖 Настройка Telegram webhook..."
curl -X POST "https://api.telegram.org/bot8463349994:AAGKX7FzQk5r5pBrGo0QV6udB41jza4OnkY/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://msk-flower.su/api/v1/telegram/webhook"}'

# Создание резервной копии
echo "💾 Создание резервной копии..."
./backup.sh

# Очистка старых логов
echo "🧹 Очистка старых логов..."
find /opt/msk-flower/logs -name "*.log" -mtime +7 -delete

# Проверка использования диска
echo "💿 Проверка использования диска..."
df -h

# Проверка использования памяти
echo "🧠 Проверка использования памяти..."
free -h

# Статистика контейнеров
echo "📊 Статистика контейнеров..."
docker stats --no-stream

echo "✅ Деплой завершен успешно!"
echo ""
echo "🌐 Сайт: https://msk-flower.su"
echo "🤖 Telegram бот: @Flower_Moscow_appbot"
echo "📊 Мониторинг: docker-compose logs -f"
echo "🔄 Перезапуск: docker-compose restart"
echo "🛑 Остановка: docker-compose down" 