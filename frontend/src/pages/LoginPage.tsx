import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
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
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Ошибка входа')
      }

      // Получаем информацию о пользователе
      const userResponse = await fetch('/api/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${data.access_token}`,
        },
      })

      const userData = await userResponse.json()
      
      login(userData, data.access_token)
      navigate(userData.role === 'admin' ? '/admin' : '/')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🌸 Вход в аккаунт
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Punk rock цветы ждут вас!
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            {error}
          </Alert>
        )}

        <Card className="p-8">
          <div className="space-y-6">
            {/* Telegram авторизация */}
            {isTelegramAvailable && (
              <div className="space-y-4">
                <Button
                  onClick={handleTelegramAuth}
                  disabled={isLoading}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.463 1.871-1.724 2.231-3.463 1.402l-1.563-1.095-1.374 1.343c-.132.131-.243.243-.5.243l.178-2.543 5.982-5.406c.258-.23-.057-.357-.4-.126l-7.4 4.662-3.174-.992c-.684-.214-.699-.684.143-1.008L16.58 7.752c.57-.213 1.067.128.987.408z"/>
                  </svg>
                  {isLoading ? 'Вход...' : 'Войти через Telegram'}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">или</span>
                  </div>
                </div>
              </div>
            )}

            {/* Обычная форма */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="admin@flowerpunk.ru"
                  className="mt-1"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Пароль
                </label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white"
              >
                {isLoading ? 'Вход...' : 'Войти'}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Тестовые данные:
              </p>
              <p className="text-xs text-gray-500 mt-1">
                admin@flowerpunk.ru / password123
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
} 