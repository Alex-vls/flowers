import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Alert from '@/components/ui/Alert'
import { useAuthStore } from '@/store/authStore'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string
        initDataUnsafe: {
          user?: {
            id: number
            first_name: string
            last_name?: string
            username?: string
          }
        }
      }
    }
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, setError, setLoading, error, isLoading } = useAuthStore()

  const handleTelegramAuth = async () => {
    setLoading(true)
    setError(null)

    try {
      const tg = window.Telegram?.WebApp
      if (!tg?.initDataUnsafe?.user) {
        throw new Error('Telegram WebApp недоступен')
      }

      const user = tg.initDataUnsafe.user
      
      const response = await fetch('/api/v1/auth/telegram-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_id: user.id.toString(),
          first_name: user.first_name,
          last_name: user.last_name,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Ошибка Telegram авторизации')
      }

      login(data.user, data.access_token)
      navigate(data.user.role === 'admin' ? '/admin' : '/')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const isTelegramAvailable = window.Telegram?.WebApp?.initDataUnsafe?.user

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🌸</div>
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
            MSK Flower
          </h2>
          <p className="text-sm text-gray-600">
            Punk rock доставка цветов
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}

        <Card className="p-8">
          <div className="space-y-6">
            {isTelegramAvailable ? (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Добро пожаловать! 🎉
                  </h3>
                  <p className="text-sm text-gray-600">
                    Войдите через Telegram, чтобы получить персонализированный опыт
                  </p>
                </div>

                <Button
                  onClick={handleTelegramAuth}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 text-lg font-medium shadow-lg transform transition hover:scale-105"
                >
                  <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.463 1.871-1.724 2.231-3.463 1.402l-1.563-1.095-1.374 1.343c-.132.131-.243.243-.5.243l.178-2.543 5.982-5.406c.258-.23-.057-.357-.4-.126l-7.4 4.662-3.174-.992c-.684-.214-.699-.684.143-1.008L16.58 7.752c.57-.213 1.067.128.987.408z"/>
                  </svg>
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Подключение...
                    </div>
                  ) : (
                    'Войти через Telegram'
                  )}
                </Button>

                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="text-blue-600 text-xl mr-3">ℹ️</div>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Что вас ждет:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Персональные уведомления в Telegram</li>
                        <li>Быстрое оформление заказов</li>
                        <li>Управление подписками через бот</li>
                        <li>Бонусные баллы и скидки</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">🤖</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Вход только через Telegram
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Наш сервис работает исключительно через Telegram для максимального удобства
                  </p>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-start">
                    <div className="text-yellow-600 text-xl mr-3">⚠️</div>
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-2">Чтобы войти в систему:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Найдите бота <strong>@Flower_Moscow_appbot</strong> в Telegram</li>
                        <li>Нажмите <strong>/start</strong></li>
                        <li>Используйте кнопку <strong>"Открыть магазин"</strong></li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <a
                    href="https://t.me/Flower_Moscow_appbot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.463 1.871-1.724 2.231-3.463 1.402l-1.563-1.095-1.374 1.343c-.132.131-.243.243-.5.243l.178-2.543 5.982-5.406c.258-.23-.057-.357-.4-.126l-7.4 4.662-3.174-.992c-.684-.214-.699-.684.143-1.008L16.58 7.752c.57-.213 1.067.128.987.408z"/>
                    </svg>
                    Открыть Telegram бот
                  </a>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Время работы: 8:00 - 22:00 | Поддержка: @Flower_Moscow_appbot
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
} 