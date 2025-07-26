import { test, expect } from '@playwright/test'

/**
 * 🔐 Authentication E2E Tests
 * Критические тесты системы аутентификации
 */

test.describe('Authentication System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Очищаем localStorage перед каждым тестом
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('should display login page for unauthenticated users', async ({ page }) => {
    await page.goto('/profile')
    
    // Должен перенаправить на страницу входа
    await expect(page).toHaveURL('/login')
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })

  test('should authenticate via Telegram test login', async ({ page }) => {
    await page.goto('/login')
    
    // Нажимаем на тестовую кнопку входа
    await page.click('[data-testid="telegram-test-login"]')
    
    // Ожидаем перенаправления на главную
    await expect(page).toHaveURL('/')
    
    // Проверяем что пользователь авторизован
    await expect(page.locator('[data-testid="user-profile-button"]')).toBeVisible()
    
    // Проверяем что токен сохранен
    const token = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(token).toBeTruthy()
  })

  test('should maintain authentication after page reload', async ({ page }) => {
    // Авторизуемся
    await page.goto('/login')
    await page.click('[data-testid="telegram-test-login"]')
    await expect(page).toHaveURL('/')
    
    // Перезагружаем страницу
    await page.reload()
    
    // Проверяем что пользователь остался авторизованным
    await expect(page.locator('[data-testid="user-profile-button"]')).toBeVisible()
  })

  test('should logout user and clear tokens', async ({ page }) => {
    // Авторизуемся
    await page.goto('/login')
    await page.click('[data-testid="telegram-test-login"]')
    await expect(page).toHaveURL('/')
    
    // Выходим
    await page.click('[data-testid="user-profile-button"]')
    await page.click('[data-testid="logout-button"]')
    
    // Проверяем что перенаправлен на главную и токены очищены
    await expect(page).toHaveURL('/')
    
    const token = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(token).toBeNull()
    
    // Проверяем что кнопка входа появилась
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
  })

  test('should handle expired token gracefully', async ({ page }) => {
    await page.goto('/')
    
    // Устанавливаем истекший токен
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'expired.token.here')
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user: { id: 1, full_name: 'Test User', role: 'client' }
        }
      }))
    })
    
    // Перезагружаем страницу
    await page.reload()
    
    // Проверяем что токен был очищен и пользователь не авторизован
    const token = await page.evaluate(() => localStorage.getItem('access_token'))
    expect(token).toBeNull()
    
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()
  })

  test('should redirect admin users to admin panel', async ({ page }) => {
    await page.goto('/login')
    
    // Мокаем админа
    await page.evaluate(() => {
      // Мокаем API ответ для админа
      window.fetch = async (url, options) => {
        if (url.includes('/auth/telegram-auth')) {
          return {
            ok: true,
            json: async () => ({
              access_token: 'admin.token.here',
              refresh_token: 'admin.refresh.here',
              user: {
                id: 1,
                full_name: 'Admin User',
                role: 'admin',
                is_verified: true,
                bonus_points: 0
              }
            })
          }
        }
        return fetch(url, options)
      }
    })
    
    await page.click('[data-testid="telegram-test-login"]')
    
    // Админ должен быть перенаправлен в админ панель
    await expect(page).toHaveURL('/admin')
  })
})

test.describe('Authentication API Integration', () => {
  
  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto('/login')
    
    // Мокаем сетевую ошибку
    await page.route('**/api/v1/auth/telegram-auth', route => {
      route.abort('failed')
    })
    
    await page.click('[data-testid="telegram-test-login"]')
    
    // Должно показать ошибку
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="auth-error"]')).toContainText('Ошибка авторизации')
  })

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    // Мокаем ошибку 401
    await page.route('**/api/v1/auth/telegram-auth', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid credentials' })
      })
    })
    
    await page.click('[data-testid="telegram-test-login"]')
    
    // Должно показать ошибку
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible()
  })

  test('should handle rate limiting', async ({ page }) => {
    await page.goto('/login')
    
    // Мокаем rate limit ошибку
    await page.route('**/api/v1/auth/telegram-auth', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ 
          detail: 'Rate limit exceeded. Try again in 60 seconds.' 
        }),
        headers: {
          'Retry-After': '60'
        }
      })
    })
    
    await page.click('[data-testid="telegram-test-login"]')
    
    // Должно показать ошибку с информацией о rate limit
    await expect(page.locator('[data-testid="auth-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="auth-error"]')).toContainText('Rate limit exceeded')
  })
}) 