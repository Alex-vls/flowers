# 🦊 Инструкция по тестированию Telegram авторизации в Firefox

## Проблема
Firefox блокирует всплывающие окна Telegram Login Widget с ошибкой:
```
Открытие нескольких всплывающих окон было заблокировано, так как пользователь не совершал никаких действий для их активации
```

## Решение
Реализован автоматический выбор метода авторизации:
- **Firefox**: Использует redirect вместо popup
- **Другие браузеры**: Используют popup (как раньше)

## Как протестировать

### 1. Откройте сайт в Firefox
```
https://msk-flower.su
```

### 2. Перейдите на страницу входа
- Нажмите "Войти" в верхнем меню
- Или перейдите напрямую: `https://msk-flower.su/login`

### 3. Нажмите кнопку "Login with Telegram"
- В Firefox будет использован redirect метод
- Вас перенаправит на Telegram для авторизации
- После авторизации вернет обратно на сайт с токенами

### 4. Проверьте результат
- Должны увидеть сообщение об успешной авторизации в консоли
- Кнопка "Войти" должна смениться на профиль пользователя
- В localStorage должны появиться токены

## Техническая информация

### Что изменилось:
1. **TelegramLoginWidget.tsx**: Определяет браузер и выбирает метод
2. **Backend auth.py**: Добавлен endpoint `/api/v1/auth/telegram-callback`  
3. **App.tsx**: Обработка URL параметров после redirect

### Логика работы:
```javascript
const isFirefox = navigator.userAgent.toLowerCase().includes('firefox')
if (isFirefox) {
  // Redirect на /api/v1/auth/telegram-callback
} else {
  // Popup (как раньше)
}
```

### Endpoint callback:
- **URL**: `/api/v1/auth/telegram-callback`
- **Метод**: GET
- **Параметры**: id, first_name, last_name, username, photo_url, auth_date, hash
- **Результат**: Redirect на главную с токенами в URL

## Отладка

### Консоль браузера:
```javascript
// Должно появиться при загрузке виджета
"Telegram widget script loaded successfully"
"Browser: Firefox (using redirect)" // или "Other (using popup)"

// После успешной авторизации
"🎉 Telegram auth successful! New user created" // или "Existing user logged in"
```

### Проверка токенов:
```javascript
// В консоли браузера
localStorage.getItem('access_token')
localStorage.getItem('refresh_token')
localStorage.getItem('auth-storage')
```

## Возможные проблемы

1. **Redirect не работает**: Проверьте, что backend endpoint доступен
2. **Токены не сохраняются**: Проверьте консоль на ошибки JavaScript
3. **Авторизация не проходит**: Проверьте настройки Telegram бота

## Логи для отладки

### Backend логи:
```bash
ssh root@109.238.92.204 "cd /opt/flower && docker-compose -f docker-compose.prod.yml logs backend --tail=20"
```

### Frontend в браузере:
- Откройте Developer Tools (F12)
- Вкладка Console
- Ищите сообщения с префиксами "🎉", "🔐", "❌" 