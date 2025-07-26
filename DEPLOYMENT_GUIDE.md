# 🚀 Деплой MSK Flower

## Быстрый деплой на VPS

### 1. Подготовка сервера
```bash
# Подключение к серверу
ssh root@109.238.92.204

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
apt install docker-compose-plugin -y

# Создание директории проекта
mkdir -p /opt/flower && cd /opt/flower
```

### 2. Загрузка кода
```bash
# Клонирование репозитория
git clone <repo-url> .

# Настройка прав
chown -R www-data:www-data /opt/flower
```

### 3. Настройка environment
```bash
# Создание .env файла
cp env.example .env

# Обязательные переменные:
DATABASE_URL=postgresql://flower:password@postgres:5432/flower
REDIS_URL=redis://redis:6379
SECRET_KEY=<random-secret-key>
TELEGRAM_BOT_TOKEN=<bot-token>
```

### 4. Запуск
```bash
# Сборка и запуск всех сервисов
docker-compose up -d --build

# Проверка статуса
docker-compose ps
curl http://localhost/health
```

## Обновление продакшена

### Автоматический деплой
```bash
# Использовать готовый скрипт
./deploy/deploy.sh
```

### Ручной деплой  
```bash
# Синхронизация изменений
rsync -avz --delete . root@server:/opt/flower/ \
  --exclude node_modules --exclude .git

# Перезапуск сервисов
ssh root@server 'cd /opt/flower && docker-compose restart'
```

## SSL сертификат

### Автоматический (Let's Encrypt)
```bash
# Установка certbot
apt install certbot python3-certbot-nginx -y

# Получение сертификата
certbot --nginx -d msk-flower.su

# Автообновление
crontab -e
# 0 3 * * * certbot renew --quiet
```

## Мониторинг

### Проверка здоровья системы
```bash
# API здоровье
curl https://msk-flower.su/health

# Логи сервисов
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# Статус БД
docker-compose exec postgres pg_isready
```

### Типичные проблемы

**502 Bad Gateway** 
```bash
# Проверить upstream сервисы
docker-compose restart frontend backend
```

**База недоступна**
```bash  
# Проверить PostgreSQL
docker-compose logs postgres
docker-compose restart postgres
```

**SSL проблемы**
```bash
# Обновить сертификат
certbot renew --force-renewal
nginx -s reload
```

## Бэкап

### Автоматический бэкап БД
```bash
# Создать скрипт backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U flower flower > backup_${DATE}.sql
```

### Восстановление
```bash
# Восстановить из бэкапа
docker-compose exec -T postgres psql -U flower flower < backup.sql
```

---

**⚡ Готово! Система в продакшене** 