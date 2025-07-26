# 🧪 План автоматических тестов MSK Flower

## 🎯 Покрытие тестирования: 100% пользовательских сценариев

### 1. 🔐 ТЕСТЫ АУТЕНТИФИКАЦИИ

#### **Unit Tests:**
```python
# test_auth_unit.py
def test_telegram_auth_valid_user():
    """Тест успешной Telegram авторизации"""
    
def test_telegram_auth_invalid_data():
    """Тест с невалидными данными Telegram"""
    
def test_token_generation():
    """Тест генерации JWT токенов"""
    
def test_token_expiration():
    """Тест истечения токенов"""
```

#### **Integration Tests:**
```python
# test_auth_integration.py
def test_full_telegram_auth_flow():
    """Полный цикл: Telegram данные → API → токены → доступ"""
    
def test_auto_user_creation():
    """Тест автоматического создания пользователя"""
    
def test_existing_user_login():
    """Тест входа существующего пользователя"""
```

#### **E2E Tests (Playwright):**
```typescript
// auth.spec.ts
test('Telegram авторизация на сайте', async ({ page }) => {
  await page.goto('/login')
  await page.click('[data-testid="telegram-test-login"]')
  await expect(page).toHaveURL('/')
  await expect(page.locator('[data-testid="user-profile-button"]')).toBeVisible()
})

test('Автоматическая авторизация в Mini App', async ({ page }) => {
  // Мокаем Telegram WebApp API
  await page.addInitScript(() => {
    window.Telegram = {
      WebApp: {
        initDataUnsafe: { user: { id: 12345, first_name: 'Test' } },
        ready: () => {},
        expand: () => {}
      }
    }
  })
  await page.goto('/telegram')
  await expect(page.locator('[data-testid="catalog-tab"]')).toBeVisible()
})
```

### 2. 🛒 ТЕСТЫ ПОКУПАТЕЛЬСКОГО ПУТИ

#### **E2E User Journey Tests:**
```typescript
// user_journey.spec.ts
test('Полный путь покупки: Каталог → Товар → Корзина → Заказ', async ({ page }) => {
  // 1. Авторизация
  await authenticateUser(page)
  
  // 2. Просмотр каталога
  await page.goto('/catalog')
  await expect(page.locator('[data-testid="flower-card"]')).toHaveCount.greaterThan(0)
  
  // 3. Выбор товара
  await page.click('[data-testid="flower-card"]:first-child')
  await expect(page.locator('[data-testid="flower-detail"]')).toBeVisible()
  
  // 4. Добавление в корзину
  await page.click('[data-testid="add-to-cart"]')
  await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1')
  
  // 5. Переход в корзину
  await page.goto('/cart')
  await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1)
  
  // 6. Оформление заказа
  await page.click('[data-testid="checkout-button"]')
  await page.fill('[data-testid="delivery-address"]', 'Тестовый адрес')
  await page.click('[data-testid="place-order"]')
  
  // 7. Подтверждение заказа
  await expect(page.locator('[data-testid="order-success"]')).toBeVisible()
})

test('Создание подписки', async ({ page }) => {
  await authenticateUser(page)
  await page.goto('/subscription')
  await page.click('[data-testid="create-subscription"]')
  await page.selectOption('[data-testid="frequency"]', 'weekly')
  await page.click('[data-testid="save-subscription"]')
  await expect(page.locator('[data-testid="subscription-created"]')).toBeVisible()
})
```

### 3. 🎁 ТЕСТЫ БОНУСНОЙ СИСТЕМЫ

```typescript
// bonus_system.spec.ts
test('Начисление бонусов за заказ', async ({ page }) => {
  const initialBonus = await getUserBonusPoints(page)
  await makeOrder(page, 1000) // Заказ на 1000 рублей
  const newBonus = await getUserBonusPoints(page)
  expect(newBonus).toBeGreaterThan(initialBonus)
})

test('Использование бонусов при оплате', async ({ page }) => {
  await page.goto('/cart')
  await page.click('[data-testid="use-bonus"]')
  await page.fill('[data-testid="bonus-amount"]', '100')
  await page.click('[data-testid="apply-bonus"]')
  await expect(page.locator('[data-testid="total-with-bonus"]')).toContainText('900')
})
```

### 4. 📱 ТЕСТЫ TELEGRAM MINI APP

```typescript
// telegram_app.spec.ts
test('Навигация в Mini App', async ({ page }) => {
  await setupTelegramMock(page)
  await page.goto('/telegram')
  
  // Тест табов
  await page.click('[data-testid="contacts-tab"]')
  await expect(page.locator('[data-testid="contacts-content"]')).toBeVisible()
  
  await page.click('[data-testid="subscription-tab"]')
  await expect(page.locator('[data-testid="subscription-content"]')).toBeVisible()
  
  await page.click('[data-testid="profile-tab"]')
  await expect(page.locator('[data-testid="profile-content"]')).toBeVisible()
})

test('Telegram Main Button функциональность', async ({ page }) => {
  await setupTelegramMock(page)
  await page.goto('/telegram')
  await addItemToCart(page)
  
  // Проверяем что Main Button обновился
  await expect(page.locator('[data-telegram="main-button"]')).toHaveText('Корзина (1)')
})
```

### 5. 👨‍💼 ТЕСТЫ АДМИН-ПАНЕЛИ

```typescript
// admin.spec.ts
test('Управление заказами', async ({ page }) => {
  await authenticateAsAdmin(page)
  await page.goto('/admin')
  
  // Просмотр заказов
  await page.click('[data-testid="orders-tab"]')
  await expect(page.locator('[data-testid="order-row"]')).toHaveCount.greaterThan(0)
  
  // Изменение статуса заказа
  await page.click('[data-testid="order-row"]:first-child [data-testid="status-select"]')
  await page.selectOption('[data-testid="status-select"]', 'delivered')
  await page.click('[data-testid="save-status"]')
  await expect(page.locator('[data-testid="status-updated"]')).toBeVisible()
})

test('Модерация отзывов', async ({ page }) => {
  await authenticateAsAdmin(page)
  await page.goto('/admin')
  await page.click('[data-testid="reviews-tab"]')
  await page.click('[data-testid="pending-reviews"]')
  await page.click('[data-testid="approve-review"]:first-child')
  await expect(page.locator('[data-testid="review-approved"]')).toBeVisible()
})
```

### 6. 🔒 ТЕСТЫ БЕЗОПАСНОСТИ

```python
# test_security.py
def test_unauthorized_access():
    """Тест доступа без токена"""
    response = client.get("/api/v1/orders/")
    assert response.status_code == 401

def test_invalid_token():
    """Тест с невалидным токеном"""
    headers = {"Authorization": "Bearer invalid_token"}
    response = client.get("/api/v1/orders/", headers=headers)
    assert response.status_code == 401

def test_expired_token():
    """Тест с истекшим токеном"""
    # Создаем токен с истекшим временем
    expired_token = create_expired_token()
    headers = {"Authorization": f"Bearer {expired_token}"}
    response = client.get("/api/v1/orders/", headers=headers)
    assert response.status_code == 401

def test_role_based_access():
    """Тест доступа по ролям"""
    # Клиент не может получить доступ к админ эндпоинтам
    client_token = create_client_token()
    headers = {"Authorization": f"Bearer {client_token}"}
    response = client.get("/api/v1/admin/orders", headers=headers)
    assert response.status_code == 403
```

### 7. 🚀 НАГРУЗОЧНЫЕ ТЕСТЫ

```python
# test_performance.py
def test_concurrent_orders():
    """Тест одновременного создания заказов"""
    import asyncio
    import aiohttp
    
    async def create_order():
        async with aiohttp.ClientSession() as session:
            async with session.post('/api/v1/orders/', json=order_data) as resp:
                return await resp.json()
    
    # Создаем 100 заказов одновременно
    tasks = [create_order() for _ in range(100)]
    results = await asyncio.gather(*tasks)
    
    # Проверяем что все заказы созданы успешно
    assert all(r.get('id') for r in results)

def test_api_response_time():
    """Тест времени ответа API"""
    import time
    
    start = time.time()
    response = client.get("/api/v1/flowers/")
    end = time.time()
    
    assert response.status_code == 200
    assert (end - start) < 1.0  # Ответ должен быть меньше 1 секунды
```

### 8. 📊 ТЕСТЫ МЕТРИК И АНАЛИТИКИ

```typescript
// analytics.spec.ts
test('Yandex.Metrika отслеживание', async ({ page }) => {
  // Мокаем Yandex.Metrika
  await page.addInitScript(() => {
    window.ym = jest.fn()
  })
  
  await page.goto('/catalog')
  await page.click('[data-testid="flower-card"]:first-child')
  
  // Проверяем что событие отправлено
  expect(window.ym).toHaveBeenCalledWith(103487070, 'reachGoal', 'flower_view')
})

test('Конверсия просмотр → покупка', async ({ page }) => {
  await page.goto('/flower/1')
  await page.click('[data-testid="add-to-cart"]')
  await page.goto('/cart')
  await page.click('[data-testid="checkout"]')
  
  // Проверяем событие покупки
  expect(window.ym).toHaveBeenCalledWith(103487070, 'reachGoal', 'purchase')
})
```

## 🔧 НАСТРОЙКА ТЕСТОВОГО ОКРУЖЕНИЯ

### **Docker Compose для тестов:**
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test-db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: flower_test
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
    ports:
      - "5433:5432"
  
  test-redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
  
  test-backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://test_user:test_pass@test-db:5432/flower_test
      REDIS_URL: redis://test-redis:6379
    depends_on:
      - test-db
      - test-redis
    ports:
      - "8001:8000"
```

### **CI/CD Pipeline:**
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Run Backend Tests
        run: |
          cd backend
          pip install -r requirements.txt
          pytest tests/ -v --cov=app --cov-report=xml
      
      - name: Run Frontend Tests
        run: |
          cd frontend
          npm install
          npm run test
          npm run test:e2e
      
      - name: Upload Coverage
        uses: codecov/codecov-action@v3
```

## 📈 МЕТРИКИ КАЧЕСТВА

### **Целевые показатели:**
- ✅ **Unit Tests Coverage:** >90%
- ✅ **Integration Tests:** Все API endpoints
- ✅ **E2E Tests:** Все пользовательские сценарии
- ✅ **Performance:** API < 1s, Frontend < 3s
- ✅ **Security:** 0 критических уязвимостей

### **Инструменты мониторинга:**
- **Backend:** pytest + coverage
- **Frontend:** Jest + React Testing Library + Playwright
- **API:** Postman/Newman для автоматизации
- **Performance:** Lighthouse CI
- **Security:** OWASP ZAP + Bandit 