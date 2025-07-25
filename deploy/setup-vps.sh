#!/bin/bash

# MSK Flower - VPS Setup Script
# Для Debian 12

set -e

echo "🌸 Настройка VPS для MSK Flower..."

# Обновление системы
echo "📦 Обновление системы..."
apt update && apt upgrade -y

# Установка необходимых пакетов
echo "🔧 Установка пакетов..."
apt install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    nginx \
    certbot \
    python3-certbot-nginx \
    htop \
    nano \
    vim

# Установка Docker
echo "🐳 Установка Docker..."
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Установка Docker Compose
echo "📋 Установка Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Создание пользователя для приложения
echo "👤 Создание пользователя..."
useradd -m -s /bin/bash flower
usermod -aG docker flower

# Настройка firewall
echo "🔥 Настройка firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Настройка fail2ban
echo "🛡️ Настройка fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# Создание директорий
echo "📁 Создание директорий..."
mkdir -p /opt/msk-flower
mkdir -p /opt/msk-flower/logs
mkdir -p /opt/msk-flower/backups
mkdir -p /opt/msk-flower/uploads
chown -R flower:flower /opt/msk-flower

# Настройка Nginx
echo "🌐 Настройка Nginx..."
cat > /etc/nginx/sites-available/msk-flower.su << 'EOF'
server {
    listen 80;
    server_name msk-flower.su www.msk-flower.su;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name msk-flower.su www.msk-flower.su;
    
    # SSL configuration will be added by certbot
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
    
    # Proxy to Docker containers
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files
    location /static/ {
        alias /opt/msk-flower/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Uploads
    location /uploads/ {
        alias /opt/msk-flower/uploads/;
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Активация сайта
ln -sf /etc/nginx/sites-available/msk-flower.su /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Настройка SSL
echo "🔒 Настройка SSL..."
certbot --nginx -d msk-flower.su -d www.msk-flower.su --non-interactive --agree-tos --email admin@msk-flower.su

# Настройка автоматического обновления SSL
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# Настройка логирования
echo "📝 Настройка логирования..."
cat > /etc/logrotate.d/msk-flower << 'EOF'
/opt/msk-flower/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 flower flower
    postrotate
        systemctl reload nginx
    endscript
}
EOF

# Настройка мониторинга
echo "📊 Настройка мониторинга..."
cat > /etc/systemd/system/msk-flower-monitor.service << 'EOF'
[Unit]
Description=MSK Flower Monitoring
After=network.target

[Service]
Type=simple
User=flower
WorkingDirectory=/opt/msk-flower
ExecStart=/usr/bin/docker-compose -f docker-compose.yml up -d
ExecStop=/usr/bin/docker-compose -f docker-compose.yml down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable msk-flower-monitor

# Настройка резервного копирования
echo "💾 Настройка резервного копирования..."
cat > /opt/msk-flower/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/msk-flower/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Создание резервной копии базы данных
docker exec msk-flower-postgres-1 pg_dump -U flowersub flowersub > $BACKUP_DIR/db_backup_$DATE.sql

# Создание резервной копии файлов
tar -czf $BACKUP_DIR/files_backup_$DATE.tar.gz -C /opt/msk-flower uploads/

# Удаление старых резервных копий (старше 30 дней)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
EOF

chmod +x /opt/msk-flower/backup.sh
chown flower:flower /opt/msk-flower/backup.sh

# Добавление задачи резервного копирования в cron
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/msk-flower/backup.sh") | crontab -

# Настройка переменных окружения
echo "⚙️ Настройка переменных окружения..."
cat > /opt/msk-flower/.env << 'EOF'
# Database
DATABASE_URL=postgresql://flowersub:flowersub123@postgres:5432/flowersub

# Redis
REDIS_URL=redis://redis:6379

# JWT
SECRET_KEY=your-super-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Telegram Bot
TELEGRAM_BOT_TOKEN=8463349994:AAGKX7FzQk5r5pBrGo0QV6udB41jza4OnkY
TELEGRAM_BOT_USERNAME=Flower_Moscow_appbot
TELEGRAM_WEBHOOK_URL=https://msk-flower.su/api/v1/telegram/webhook

# YooMoney
YOOMONEY_SHOP_ID=your-shop-id
YOOMONEY_SECRET_KEY=your-secret-key

# App
APP_NAME=MSK Flower API
APP_VERSION=1.0.0
DOMAIN=msk-flower.su

# Environment
ENVIRONMENT=production
DEBUG=false
EOF

chown flower:flower /opt/msk-flower/.env
chmod 600 /opt/msk-flower/.env

echo "✅ Настройка VPS завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Скопируйте файлы проекта в /opt/msk-flower/"
echo "2. Настройте переменные окружения в .env"
echo "3. Запустите приложение: docker-compose up -d"
echo "4. Проверьте логи: docker-compose logs -f"
echo ""
echo "🌐 Сайт будет доступен по адресу: https://msk-flower.su"
echo "🤖 Telegram бот: @Flower_Moscow_appbot" 