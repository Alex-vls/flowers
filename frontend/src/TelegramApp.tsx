import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/store'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { FlowerIcon, ShoppingCartIcon, UserIcon, HeartIcon } from 'lucide-react'
import { Flower } from '@/types'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void
        expand: () => void
        close: () => void
        MainButton?: {
          text: string
          color: string
          textColor: string
          isVisible: boolean
          isActive: boolean
          setText: (text: string) => void
          onClick: (callback: () => void) => void
          show: () => void
          hide: () => void
        }
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy') => void
        }
        initData: string
        initDataUnsafe: {
          user?: TelegramUser
          auth_date?: number
          hash?: string
        }
        colorScheme: 'light' | 'dark'
        platform: string
        version: string
      }
    }
  }
}

export default function TelegramApp() {
  const { user, isAuthenticated } = useAuthStore()
  const { loginTelegramMiniApp, isTelegramAuthLoading } = useAuth()
  const { items: cartItems, addToCart } = useCart()
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'profile'>('catalog')
  const [flowers, setFlowers] = useState<Flower[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  // Fetch flowers
  useEffect(() => {
    const fetchFlowers = async () => {
      try {
        const response = await fetch('/api/v1/flowers?limit=20')
        if (response.ok) {
          const data = await response.json()
          setFlowers(data?.items || [])
        }
      } catch (err) {
        setError('Не удалось загрузить каталог')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFlowers()
  }, [])

  // Initialize Telegram Web App
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp
      
      tg.ready()
      tg.expand()
      
      // Apply Telegram theme
      const isDark = tg.colorScheme === 'dark'
      document.documentElement.classList.toggle('dark', isDark)
      
      // Setup main button
      if (tg.MainButton) {
        tg.MainButton.setText('Посмотреть корзину')
        tg.MainButton.onClick(() => {
          setActiveTab('catalog')
        })
      }

      // ✅ ИСПРАВЛЕНО: Используем унифицированный useAuth hook
      if (tg.initDataUnsafe?.user && tg.initData && !isAuthenticated) {
        authenticateUser()
      }

      // Haptic feedback on interactions
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
    }
  }, [isAuthenticated])

  // Update main button based on cart
  useEffect(() => {
    if (window.Telegram?.WebApp?.MainButton && cartItems.length > 0) {
      const tg = window.Telegram.WebApp
      if (tg.MainButton) {
        tg.MainButton.setText(`Корзина (${cartItems.length})`)
        tg.MainButton.show()
      }
    }
  }, [cartItems])

  const authenticateUser = async () => {
    const tg = window.Telegram?.WebApp
    if (!tg?.initData) {
      setAuthError('Telegram данные недоступны')
      return
    }

    setAuthError(null)
    
    try {
      // ✅ ИСПРАВЛЕНО: Используем унифицированный метод из useAuth
      await loginTelegramMiniApp(tg.initData)
      
      // После успешной авторизации загружаем дополнительные данные
      if (user) {
        const flowersResponse = await fetch('/api/v1/flowers?limit=20')
        if (flowersResponse.ok) {
          const flowersData = await flowersResponse.json()
          setFlowers(flowersData?.items || [])
        }
      }
      
    } catch (error: any) {
      const errorMessage = error.message || 'Неизвестная ошибка'
      setAuthError(`Ошибка авторизации: ${errorMessage}`)
    }
  }

  const handleAddToCart = (flower: Flower) => {
    addToCart({
      id: flower.id,
      name: flower.name,
      price: flower.price,
      image_url: flower.image_url
    })
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium')
  }

  const handleAddToSubscription = (flower: Flower) => {
    if (!isAuthenticated) {
      alert('Для подписки необходимо войти в аккаунт')
      return
    }
    handleAddToSubscriptionAPI(flower.id)
  }

  const renderCatalog = () => (
    <div className="p-4 pb-20">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <FlowerIcon className="w-6 h-6 mr-2 text-pink-500" />
        Каталог цветов
      </h2>
      
      {authError && (
        <Alert type="error" className="mb-4">
          {authError}
        </Alert>
      )}
      
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <Alert type="error">
          Не удалось загрузить каталог цветов
        </Alert>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {flowers?.map((flower: Flower) => {
            const isInStock = flower.is_available
            return (
              <div key={flower.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="relative">
                  <img 
                    src={flower.image_url} 
                    alt={flower.name}
                    className="w-full h-40 object-cover"
                  />
                  {!isInStock && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-medium">Нет в наличии</span>
                    </div>
                  )}
                  <Badge 
                    className="absolute top-2 right-2 bg-white/90 text-gray-700"
                  >
                    {flower.price}₽
                  </Badge>
                </div>
                
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm">{flower.name}</h3>
                  <p className="text-xs text-gray-600 mb-3">{flower.category}</p>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleAddToCart(flower)}
                      disabled={!isInStock}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white text-xs py-2 px-3 disabled:from-gray-300 disabled:to-gray-300"
                    >
                      <ShoppingCartIcon className="w-3 h-3 mr-1" />
                      В корзину
                    </Button>
                    <Button
                      onClick={() => handleAddToSubscription(flower)}
                      disabled={!isInStock || !isAuthenticated}
                      variant="outline"
                      className="flex-shrink-0 text-xs py-2 px-3 border-pink-200 text-pink-600 hover:bg-pink-50"
                    >
                      <HeartIcon className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderProfile = () => (
    <div className="p-4">
      <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 mb-6">
        <div className="flex items-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white text-xl font-bold mr-4">
            <UserIcon className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Профиль</h2>
            {isAuthenticated ? (
              <p className="text-gray-600">{user?.full_name || 'Пользователь Telegram'}</p>
            ) : (
              <p className="text-gray-600">Для доступа к профилю необходима авторизация</p>
            )}
          </div>
        </div>

        {!isAuthenticated && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              {window.Telegram?.WebApp?.initDataUnsafe?.user 
                ? 'Нажмите для входа в ваш аккаунт'
                : 'Войдите через Telegram, чтобы получить персонализированный опыт'
              }
            </p>

            <Button
              onClick={authenticateUser}
              disabled={isTelegramAuthLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-4 text-lg font-medium shadow-lg transform transition hover:scale-105"
            >
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.463 1.871-1.724 2.231-3.463 1.402l-1.563-1.095-1.374 1.343c-.132.131-.243.243-.5.243l.178-2.543 5.982-5.406c.258-.23-.057-.357-.4-.126l-7.4 4.662-3.174-.992c-.684-.214-.699-.684.143-1.008L16.58 7.752c.57-.213 1.067.128.987.408z"/>
              </svg>
              {isTelegramAuthLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Авторизация...
                </div>
              ) : (
                'Войти'
              )}
            </Button>
          </div>
        )}

        {isAuthenticated && user && (
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl">
              <span className="text-sm font-medium text-gray-700">Email:</span>
              <span className="text-sm text-gray-900">{user.email}</span>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl">
              <span className="text-sm font-medium text-gray-700">Бонусные баллы:</span>
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white">
                {user.bonus_points || 0} баллов
              </Badge>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl">
              <span className="text-sm font-medium text-gray-700">Статус:</span>
              <Badge className="bg-gradient-to-r from-green-400 to-emerald-400 text-white">
                {user.role === 'admin' ? 'Администратор' : 'Клиент'}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {isAuthenticated && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Мои заказы</h3>
            <p className="text-sm text-gray-600">История ваших заказов и подписок</p>
            <Button variant="outline" className="mt-3 w-full">
              Посмотреть заказы
            </Button>
          </Card>
          
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Подписки</h3>
            <p className="text-sm text-gray-600">Управление активными подписками</p>
            <Button variant="outline" className="mt-3 w-full">
              Мои подписки
            </Button>
          </Card>
        </div>
      )}

      <div className="mt-8 text-center">
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
  )

  const handleAddToSubscriptionAPI = async (flowerId: number) => {
    try {
      // Implementation for subscription API call
      console.log('Adding to subscription:', flowerId)
    } catch (error) {
      console.error('Subscription error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* Main Content */}
      <div className="pb-16">
        {activeTab === 'catalog' && renderCatalog()}
        {activeTab === 'profile' && renderProfile()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around items-center">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              activeTab === 'catalog'
                ? 'text-pink-600 bg-pink-50'
                : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <FlowerIcon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Каталог</span>
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              activeTab === 'profile'
                ? 'text-pink-600 bg-pink-50'
                : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <UserIcon className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Профиль</span>
          </button>
        </div>
      </div>
    </div>
  )
} 