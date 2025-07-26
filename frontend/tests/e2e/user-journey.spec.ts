import { test, expect } from '@playwright/test'

/**
 * 🛒 User Journey E2E Tests
 * Критические тесты пользовательского пути покупки
 */

// Helper function для авторизации
async function authenticateUser(page) {
  await page.goto('/login')
  await page.click('[data-testid="telegram-test-login"]')
  await expect(page).toHaveURL('/')
}

test.describe('Complete Purchase Journey', () => {
  
  test('should complete full purchase flow: catalog → product → cart → order', async ({ page }) => {
    // 1. Авторизация
    await authenticateUser(page)
    
    // 2. Переход в каталог
    await page.goto('/catalog')
    await expect(page.locator('[data-testid="catalog-title"]')).toBeVisible()
    
    // Ждем загрузки цветов
    await expect(page.locator('[data-testid="flower-card"]').first()).toBeVisible()
    
    // 3. Выбор первого цветка
    const firstFlower = page.locator('[data-testid="flower-card"]').first()
    const flowerName = await firstFlower.locator('[data-testid="flower-name"]').textContent()
    
    await firstFlower.click()
    
    // Проверяем что попали на страницу товара
    await expect(page.locator('[data-testid="flower-detail"]')).toBeVisible()
    await expect(page.locator('[data-testid="flower-title"]')).toContainText(flowerName)
    
    // 4. Добавление в корзину
    await page.click('[data-testid="add-to-cart"]')
    
    // Проверяем что счетчик корзины обновился
    await expect(page.locator('[data-testid="cart-count"]')).toHaveText('1')
    
    // 5. Переход в корзину
    await page.click('[data-testid="cart-button"]')
    await expect(page).toHaveURL('/cart')
    
    // Проверяем что товар в корзине
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1)
    await expect(page.locator('[data-testid="cart-item-name"]')).toContainText(flowerName)
    
    // 6. Изменение количества
    await page.click('[data-testid="quantity-increase"]')
    await expect(page.locator('[data-testid="quantity-input"]')).toHaveValue('2')
    
    // Проверяем что общая сумма обновилась
    const totalElement = page.locator('[data-testid="cart-total"]')
    await expect(totalElement).toBeVisible()
    
    // 7. Оформление заказа
    await page.click('[data-testid="checkout-button"]')
    
    // Заполняем форму доставки
    await page.fill('[data-testid="delivery-address"]', 'ул. Тестовая, д. 1, кв. 1')
    await page.fill('[data-testid="delivery-phone"]', '+7 (999) 123-45-67')
    await page.selectOption('[data-testid="delivery-time"]', 'morning')
    
    // Выбираем дату доставки (завтра)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    await page.fill('[data-testid="delivery-date"]', tomorrowStr)
    
    // 8. Размещение заказа
    await page.click('[data-testid="place-order"]')
    
    // 9. Подтверждение заказа
    await expect(page.locator('[data-testid="order-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="order-number"]')).toBeVisible()
    
    // Получаем номер заказа
    const orderNumber = await page.locator('[data-testid="order-number"]').textContent()
    expect(orderNumber).toMatch(/FL-\d{8}-[A-Z0-9]{8}/)
    
    // 10. Переход к заказам
    await page.click('[data-testid="view-orders"]')
    await expect(page).toHaveURL('/orders')
    
    // Проверяем что заказ появился в списке
    await expect(page.locator('[data-testid="order-item"]').first()).toBeVisible()
    await expect(page.locator('[data-testid="order-item"]').first()).toContainText(orderNumber)
  })

  test('should handle empty cart checkout attempt', async ({ page }) => {
    await authenticateUser(page)
    
    await page.goto('/cart')
    
    // Проверяем что корзина пуста
    await expect(page.locator('[data-testid="empty-cart"]')).toBeVisible()
    
    // Кнопка оформления должна быть неактивна
    await expect(page.locator('[data-testid="checkout-button"]')).toBeDisabled()
  })

  test('should validate delivery form fields', async ({ page }) => {
    await authenticateUser(page)
    
    // Добавляем товар в корзину
    await page.goto('/catalog')
    await page.locator('[data-testid="flower-card"]').first().click()
    await page.click('[data-testid="add-to-cart"]')
    
    // Переходим к оформлению
    await page.goto('/cart')
    await page.click('[data-testid="checkout-button"]')
    
    // Пытаемся разместить заказ без заполнения формы
    await page.click('[data-testid="place-order"]')
    
    // Должны появиться ошибки валидации
    await expect(page.locator('[data-testid="address-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="phone-error"]')).toBeVisible()
    
    // Заполняем некорректный телефон
    await page.fill('[data-testid="delivery-phone"]', '123')
    await page.click('[data-testid="place-order"]')
    
    await expect(page.locator('[data-testid="phone-error"]')).toContainText('Некорректный формат')
  })

  test('should apply and remove bonus points', async ({ page }) => {
    await authenticateUser(page)
    
    // Мокаем пользователя с бонусами
    await page.evaluate(() => {
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { 
            id: 1, 
            full_name: 'Test User', 
            role: 'client',
            bonus_points: 500 
          }
        }
      }))
    })
    
    await page.reload()
    
    // Добавляем товар
    await page.goto('/catalog')
    await page.locator('[data-testid="flower-card"]').first().click()
    await page.click('[data-testid="add-to-cart"]')
    
    await page.goto('/cart')
    
    // Применяем бонусы
    await page.click('[data-testid="use-bonus-toggle"]')
    await page.fill('[data-testid="bonus-amount"]', '100')
    await page.click('[data-testid="apply-bonus"]')
    
    // Проверяем что скидка применилась
    await expect(page.locator('[data-testid="bonus-discount"]')).toContainText('100 ₽')
    
    // Убираем бонусы
    await page.click('[data-testid="remove-bonus"]')
    await expect(page.locator('[data-testid="bonus-discount"]')).not.toBeVisible()
  })
})

test.describe('Subscription Journey', () => {
  
  test('should create weekly flower subscription', async ({ page }) => {
    await authenticateUser(page)
    
    await page.goto('/subscription')
    
    // Создаем подписку
    await page.click('[data-testid="create-subscription"]')
    
    // Выбираем параметры
    await page.selectOption('[data-testid="frequency-select"]', 'weekly')
    await page.selectOption('[data-testid="day-select"]', 'monday')
    await page.selectOption('[data-testid="time-select"]', 'morning')
    
    // Выбираем цветы
    await page.click('[data-testid="flower-option"]').first()
    
    // Заполняем адрес
    await page.fill('[data-testid="subscription-address"]', 'ул. Подписная, д. 2')
    
    // Сохраняем подписку
    await page.click('[data-testid="save-subscription"]')
    
    // Проверяем успешное создание
    await expect(page.locator('[data-testid="subscription-created"]')).toBeVisible()
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Активна')
  })

  test('should pause and resume subscription', async ({ page }) => {
    await authenticateUser(page)
    
    // Предполагаем что подписка уже создана
    await page.goto('/subscription')
    
    // Приостанавливаем подписку
    await page.click('[data-testid="pause-subscription"]')
    await page.click('[data-testid="confirm-pause"]')
    
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Приостановлена')
    
    // Возобновляем подписку
    await page.click('[data-testid="resume-subscription"]')
    await page.click('[data-testid="confirm-resume"]')
    
    await expect(page.locator('[data-testid="subscription-status"]')).toContainText('Активна')
  })
})

test.describe('Error Handling', () => {
  
  test('should handle API errors during checkout', async ({ page }) => {
    await authenticateUser(page)
    
    // Добавляем товар
    await page.goto('/catalog')
    await page.locator('[data-testid="flower-card"]').first().click()
    await page.click('[data-testid="add-to-cart"]')
    
    await page.goto('/cart')
    await page.click('[data-testid="checkout-button"]')
    
    // Заполняем форму
    await page.fill('[data-testid="delivery-address"]', 'ул. Тестовая, д. 1')
    await page.fill('[data-testid="delivery-phone"]', '+7 (999) 123-45-67')
    
    // Мокаем ошибку API
    await page.route('**/api/v1/orders/', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' })
      })
    })
    
    await page.click('[data-testid="place-order"]')
    
    // Должна появиться ошибка
    await expect(page.locator('[data-testid="order-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="order-error"]')).toContainText('Ошибка при оформлении заказа')
  })

  test('should handle network connectivity issues', async ({ page }) => {
    await authenticateUser(page)
    
    // Отключаем сеть
    await page.context().setOffline(true)
    
    await page.goto('/catalog')
    
    // Должно показать ошибку загрузки
    await expect(page.locator('[data-testid="network-error"]')).toBeVisible()
    
    // Включаем сеть
    await page.context().setOffline(false)
    
    // Нажимаем "Повторить"
    await page.click('[data-testid="retry-button"]')
    
    // Каталог должен загрузиться
    await expect(page.locator('[data-testid="flower-card"]').first()).toBeVisible()
  })
}) 