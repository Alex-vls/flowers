import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Alert } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import TelegramLoginWidget from '@/components/TelegramLoginWidget'
import api from '@/lib/api'

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
        colorScheme?: string
        themeParams?: any
        isExpanded?: boolean
        viewportHeight?: number
        viewportStableHeight?: number
        headerColor?: string
        backgroundColor?: string
        BackButton?: {
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
        }
        MainButton?: {
          text: string
          color: string
          textColor: string
          isVisible: boolean
          isProgressVisible: boolean
          show: () => void
          hide: () => void
          enable: () => void
          disable: () => void
          showProgress: () => void
          hideProgress: () => void
          setText: (text: string) => void
          onClick: (callback: () => void) => void
        }
        HapticFeedback?: {
          impactOccurred: (style: string) => void
          notificationOccurred: (type: string) => void
          selectionChanged: () => void
        }
        expand: () => void
        close?: () => void
        ready: () => void
      }
    }
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useAuth()
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Проверяем, залогинен ли пользователь
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const handleTelegramAuth = async (telegramUser: any) => {
    setLoading(true)
    setError(null)

    try {
      // Используем endpoint для веб-сайта
      const response = await api.post('/auth/telegram-website', {
        id: telegramUser.id.toString(),
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name || null,
        username: telegramUser.username || null,
        photo_url: telegramUser.photo_url || null,
        auth_date: telegramUser.auth_date,
        hash: telegramUser.hash
      })

      const data = response.data

      // Store tokens
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)

      // Update store
      login(data.user, data.access_token)
      
      // Redirect based on role
      window.location.href = data.user.role === 'admin' ? '/admin' : '/'
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Ошибка авторизации')
    } finally {
      setLoading(false)
    }
  }

  // Если пользователь уже авторизован, показываем сообщение
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50">
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">🌸</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Вы уже авторизованы!
          </h2>
          <Button onClick={() => navigate('/')} className="bg-pink-500 hover:bg-pink-600">
            Перейти на главную
          </Button>
        </Card>
      </div>
    )
  }

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
          <Alert>
            {error}
          </Alert>
        )}

        <Card className="p-8">
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Войти в систему
              </h3>
              <p className="text-sm text-gray-600">
                Войдите через Telegram, чтобы получить персонализированный опыт
              </p>
            </div>

            {/* Website Telegram Login Widget */}
            <div className="space-y-4">
              <div className="text-center">
                <TelegramLoginWidget
                  botName="Flower_Moscow_appbot"
                  onAuth={handleTelegramAuth}
                  buttonSize="large"
                  requestAccess={true}
                  className="flex justify-center"
                />
                
                {/* Временная авторизация через бота */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 mb-2">
                    Для входа в систему:
                  </p>
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        // Открываем бота для получения данных пользователя
                        window.open('https://t.me/Flower_Moscow_appbot', '_blank')
                      }}
                      variant="outline" 
                      className="w-full bg-blue-500 text-white hover:bg-blue-600"
                    >
                      🤖 Открыть бота
                    </Button>
                    <Button
                      onClick={() => {
                        // Создаем тестового пользователя
                        const testUser = {
                          id: "12345",
                          first_name: "Тест",
                          last_name: "Пользователь", 
                          username: "test_user"
                        }
                        handleTelegramAuth(testUser)
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      🔑 Тестовый вход
                    </Button>
                  </div>
                </div>
                
                {isLoading && (
                  <div className="mt-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>
                    <span className="text-sm text-gray-600">Авторизация...</span>
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  Нажимая кнопку выше, вы соглашаетесь с{' '}
                  <a href="/policy" className="text-blue-600 hover:underline">
                    политикой конфиденциальности
                  </a>
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Еще нет Telegram? 
          </p>
          <div className="flex justify-center space-x-4">
            <a 
              href="https://telegram.org/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              Скачать Telegram
            </a>
            <a 
              href="https://t.me/Flower_Moscow_appbot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              Открыть наш бот
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 