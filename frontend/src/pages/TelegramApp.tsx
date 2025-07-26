import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/store'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Alert from '@/components/ui/Alert'
import { 
  FlowerIcon, 
  UserIcon, 
  ShoppingBagIcon,
  BellIcon,
  GiftIcon
} from 'lucide-react'
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
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'profile' | 'orders' | 'notifications' | 'bonuses'>('catalog')
  const [profileTab, setProfileTab] = useState<'orders' | 'history' | 'subscription'>('orders')
  const [flowers, setFlowers] = useState<Flower[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null) // ✅ НОВОЕ: Отладочная информация

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
    console.log('🔍 TelegramApp: Starting initialization...')
    console.log('🔍 window.Telegram:', window.Telegram)
    console.log('🔍 window.Telegram?.WebApp:', window.Telegram?.WebApp)
    
    // ✅ ОТЛАДКА: Проверяем наличие Telegram WebApp API
    if (!window.Telegram) {
      console.error('❌ TelegramApp: window.Telegram не найден!')
      setAuthError('Telegram WebApp API недоступен. Попробуйте открыть приложение в Telegram.')
      return
    }
    
    if (!window.Telegram.WebApp) {
      console.error('❌ TelegramApp: window.Telegram.WebApp не найден!')
      setAuthError('Telegram WebApp не инициализирован. Убедитесь что открываете Mini App в Telegram.')
      return
    }
    
    const tg = window.Telegram.WebApp
    
    console.log('🔍 TelegramApp: Initializing WebApp', {
      initData: tg.initData ? `${tg.initData.length} chars` : 'empty',
      initDataUnsafe: tg.initDataUnsafe,
      user: tg.initDataUnsafe?.user,
      isAuthenticated: isAuthenticated,
      version: tg.version,
      colorScheme: tg.colorScheme,
      isExpanded: tg.isExpanded
    })
    
    tg.ready()
    tg.expand()
    
    console.log('📱 TelegramApp: WebApp ready and expanded')
    
    // Apply Telegram theme
    const isDark = tg.colorScheme === 'dark'
    document.documentElement.classList.toggle('dark', isDark)
    console.log('🎨 TelegramApp: Theme applied:', isDark ? 'dark' : 'light')
    
    // Setup main button
    if (tg.MainButton) {
      tg.MainButton.setText('Посмотреть корзину')
      tg.MainButton.onClick(() => {
        setActiveTab('catalog')
      })
      console.log('🔘 TelegramApp: Main button configured')
    }

    // ✅ УЛУЧШЕНИЕ: Автоматическая авторизация при наличии данных
    if (tg.initDataUnsafe?.user && tg.initData && !isAuthenticated) {
      console.log('🚀 TelegramApp: Auto-authenticating user', tg.initDataUnsafe.user)
      console.log('🔐 TelegramApp: initData preview:', tg.initData.substring(0, 100) + '...')
      authenticateUser()
    } else {
      console.log('❌ TelegramApp: Auto-auth skipped', {
        hasUser: !!tg.initDataUnsafe?.user,
        hasInitData: !!tg.initData,
        initDataLength: tg.initData?.length || 0,
        isAuthenticated: isAuthenticated
      })
      
      // ✅ НОВОЕ: Если нет данных пользователя, показываем детальную информацию
      if (!tg.initDataUnsafe?.user) {
        console.warn('⚠️ TelegramApp: Нет данных пользователя в initDataUnsafe')
        console.log('🔍 TelegramApp: Детали:', {
          initDataUnsafe: tg.initDataUnsafe,
          platform: tg.platform,
          version: tg.version
        })
      }
      
      if (!tg.initData) {
        console.warn('⚠️ TelegramApp: Нет initData')
      }
    }

    // Haptic feedback on interactions
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
    console.log('📳 TelegramApp: Haptic feedback activated')

    // ✅ НОВОЕ: Также проверяем при изменении isAuthenticated
    if (isAuthenticated) {
      console.log('✅ TelegramApp: User authenticated, switching to profile tab')
      setActiveTab('profile')
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
      console.error('❌ TelegramApp: No initData available for authentication')
      setAuthError('Telegram данные недоступны')
      return
    }

    console.log('🔐 TelegramApp: Starting authentication...')
    setAuthError(null)
    setDebugInfo({ step: 'Авторизация...', timestamp: new Date().toLocaleTimeString() })
    
    try {
      // ✅ ИСПРАВЛЕНО: Используем унифицированный метод из useAuth
      await loginTelegramMiniApp(tg.initData)
      
      console.log('✅ TelegramApp: Authentication successful!')
      
      // ✅ НОВОЕ: Проверяем что токены сохранились
      const savedAccessToken = localStorage.getItem('access_token')
      const savedRefreshToken = localStorage.getItem('refresh_token')
      
      const tokenCheck = {
        hasAccessToken: !!savedAccessToken,
        accessTokenLength: savedAccessToken?.length || 0,
        hasRefreshToken: !!savedRefreshToken,
        refreshTokenLength: savedRefreshToken?.length || 0,
        localStorageSupported: typeof(Storage) !== "undefined"
      }
      
      console.log('🔍 TelegramApp: Saved tokens check:', tokenCheck)
      
      // ✅ НОВОЕ: Тестируем работу токена
      let tokenTestResult = null
      if (savedAccessToken) {
        console.log('🧪 TelegramApp: Testing token with /users/me...')
        try {
          const testResponse = await fetch('/api/v1/users/me', {
            headers: {
              'Authorization': `Bearer ${savedAccessToken}`,
              'Content-Type': 'application/json'
            }
          })
          
          tokenTestResult = {
            status: testResponse.status,
            statusText: testResponse.statusText,
            ok: testResponse.ok
          }
          
          console.log('🧪 TelegramApp: Token test result:', tokenTestResult)
          
          if (testResponse.ok) {
            const userData = await testResponse.json()
            console.log('✅ TelegramApp: Token works! User data:', userData)
          } else {
            const errorData = await testResponse.json()
            console.error('❌ TelegramApp: Token failed:', errorData)
            tokenTestResult.error = errorData
          }
        } catch (tokenTestError) {
          console.error('❌ TelegramApp: Token test error:', tokenTestError)
          tokenTestResult = { error: String(tokenTestError) }
        }
      }
      
      // ✅ НОВОЕ: Сохраняем отладочную информацию для показа в UI
      setDebugInfo({
        step: 'Авторизация завершена',
        timestamp: new Date().toLocaleTimeString(),
        tokens: tokenCheck,
        tokenTest: tokenTestResult,
        userAuthenticated: isAuthenticated
      })
      
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
      console.error('❌ TelegramApp: Authentication failed:', errorMessage)
      setAuthError(`Ошибка авторизации: ${errorMessage}`)
      setDebugInfo({
        step: 'Ошибка авторизации',
        timestamp: new Date().toLocaleTimeString(),
        error: errorMessage
      })
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
                      <ShoppingBagIcon className="w-3 h-3 mr-1" />
                      В корзину
                    </Button>
                    <Button
                      onClick={() => handleAddToSubscription(flower)}
                      disabled={!isInStock || !isAuthenticated}
                      variant="outline"
                      className="flex-shrink-0 text-xs py-2 px-3 border-pink-200 text-pink-600 hover:bg-pink-50"
                    >
                      <GiftIcon className="w-3 h-3" />
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

  const renderProfileOrders = () => (
    <div className="space-y-3">
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-gray-800">Заказ #ORD-001</h4>
          <Badge className="bg-green-100 text-green-600">Доставлен</Badge>
        </div>
        <p className="text-sm text-gray-600 mb-1">Букет роз "Нежность"</p>
        <p className="text-lg font-bold text-pink-600">2,500 ₽</p>
        <p className="text-xs text-gray-400">15 января 2025</p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-gray-800">Заказ #ORD-002</h4>
          <Badge className="bg-blue-100 text-blue-600">В пути</Badge>
        </div>
        <p className="text-sm text-gray-600 mb-1">Тюльпаны микс</p>
        <p className="text-lg font-bold text-pink-600">1,800 ₽</p>
        <p className="text-xs text-gray-400">26 января 2025</p>
      </div>
    </div>
  )

  const renderProfileHistory = () => (
    <div className="space-y-3">
      <div className="text-center py-8">
        <div className="text-4xl mb-2">📚</div>
        <h3 className="font-semibold text-gray-800 mb-2">История покупок</h3>
        <p className="text-gray-600 text-sm">Здесь будет отображаться полная история ваших покупок и взаимодействий</p>
      </div>
    </div>
  )

  const renderProfileSubscription = () => (
    <div className="space-y-3">
      <div className="text-center py-8">
        <div className="text-4xl mb-2">📅</div>
        <h3 className="font-semibold text-gray-800 mb-2">Подписка на цветы</h3>
        <p className="text-gray-600 text-sm mb-4">Регулярная доставка свежих цветов</p>
        <Button className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
          Оформить подписку
        </Button>
      </div>
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
              <p className="text-gray-600">Загрузка данных пользователя...</p>
            )}
          </div>
        </div>

        {!isAuthenticated && !isTelegramAuthLoading && (
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

        {isTelegramAuthLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mr-3"></div>
            <span className="text-gray-700">Выполняется автоматическая авторизация...</span>
          </div>
        )}

        {authError && (
          <Alert type="error" className="mb-4">
            {authError}
            <Button 
              onClick={authenticateUser}
              className="mt-2 text-sm"
              variant="outline"
            >
              Попробовать снова
            </Button>
          </Alert>
        )}

        {/* ✅ ВРЕМЕННАЯ ОТЛАДКА: Всегда показываем состояние */}
        {/* ✅ Убираем диагностическую панель - проблема решена */}

        {/* ✅ НОВОЕ: Отладочная панель */}
        {debugInfo && (
          <div className="mb-4 p-3 bg-gray-100 rounded-lg text-xs">
            <div className="font-bold text-blue-600 mb-2">🔍 Отладка: {debugInfo.step}</div>
            <div className="text-gray-500 mb-2">Время: {debugInfo.timestamp}</div>
            
            {debugInfo.tokens && (
              <div className="mb-2">
                <div className="font-semibold">Токены:</div>
                <div className="ml-2">
                  <div>Access: {debugInfo.tokens.hasAccessToken ? '✅' : '❌'} ({debugInfo.tokens.accessTokenLength} символов)</div>
                  <div>Refresh: {debugInfo.tokens.hasRefreshToken ? '✅' : '❌'} ({debugInfo.tokens.refreshTokenLength} символов)</div>
                  <div>LocalStorage: {debugInfo.tokens.localStorageSupported ? '✅' : '❌'}</div>
                </div>
              </div>
            )}
            
            {debugInfo.tokenTest && (
              <div className="mb-2">
                <div className="font-semibold">Тест токена:</div>
                <div className="ml-2">
                  <div>Статус: {debugInfo.tokenTest.status} ({debugInfo.tokenTest.ok ? '✅' : '❌'})</div>
                  {debugInfo.tokenTest.error && (
                    <div className="text-red-600">Ошибка: {JSON.stringify(debugInfo.tokenTest.error)}</div>
                  )}
                </div>
              </div>
            )}
            
            {debugInfo.error && (
              <div className="text-red-600">
                <div className="font-semibold">Ошибка:</div>
                <div>{debugInfo.error}</div>
              </div>
            )}
            
            <div className="mt-2">
              <div>Пользователь авторизован: {isAuthenticated ? '✅' : '❌'}</div>
              <div>Имя пользователя: {user?.full_name || 'не определено'}</div>
            </div>
          </div>
        )}

        {isAuthenticated && user && (
          <div className="space-y-4">
            {/* Основная информация профиля */}
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/60 rounded-xl">
                <span className="text-sm font-medium text-gray-700">Бонусные баллы:</span>
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white">
                  {user.bonus_points || 0} баллов
                </Badge>
              </div>
            </div>

            {/* Табы для профиля */}
            <div className="bg-white/60 rounded-xl p-4">
              <div className="flex space-x-1 mb-4">
                <button 
                  onClick={() => setProfileTab('orders')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    profileTab === 'orders' 
                      ? 'bg-pink-500 text-white' 
                      : 'text-gray-600 hover:text-pink-600'
                  }`}
                >
                  📦 Заказы
                </button>
                <button 
                  onClick={() => setProfileTab('history')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    profileTab === 'history' 
                      ? 'bg-pink-500 text-white' 
                      : 'text-gray-600 hover:text-pink-600'
                  }`}
                >
                  📚 История
                </button>
                <button 
                  onClick={() => setProfileTab('subscription')}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                    profileTab === 'subscription' 
                      ? 'bg-pink-500 text-white' 
                      : 'text-gray-600 hover:text-pink-600'
                  }`}
                >
                  📅 Подписка
                </button>
              </div>

              {/* Содержимое табов */}
              <div className="min-h-[200px]">
                {profileTab === 'orders' && renderProfileOrders()}
                {profileTab === 'history' && renderProfileHistory()}
                {profileTab === 'subscription' && renderProfileSubscription()}
              </div>
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

  const renderBonuses = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">💎 Бонусы</h2>
      <div className="bg-white rounded-xl p-6 shadow-lg mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">{user?.bonus_points || 0}</div>
          <div className="text-gray-600">Доступные бонусы</div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 shadow-lg">
        <h3 className="font-semibold mb-3">🎁 Программа лояльности</h3>
        <p className="text-gray-600">Зарабатывайте бонусы за каждую покупку!</p>
      </div>
    </div>
  )

  const renderNotifications = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">🔔 Уведомления</h2>
      <div className="space-y-3">
        <div className="bg-white rounded-xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <h3 className="font-semibold">Добро пожаловать!</h3>
              <p className="text-gray-600 text-sm">Спасибо за регистрацию в нашем боте</p>
              <div className="text-xs text-gray-400 mt-1">Только что</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderOrders = () => (
    <div className="p-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">📦 Заказы</h2>
      <div className="space-y-3">
        <div className="bg-white rounded-xl p-4 shadow-lg">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold">Заказ #1001</h3>
              <p className="text-gray-600 text-sm">Букет роз "Нежность"</p>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-sm">Доставлен</span>
          </div>
          <div className="text-lg font-bold text-pink-600">2,500 ₽</div>
          <div className="text-xs text-gray-400 mt-1">15 января 2025</div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-lg">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold">Заказ #1002</h3>
              <p className="text-gray-600 text-sm">Тюльпаны микс</p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm">В пути</span>
          </div>
          <div className="text-lg font-bold text-pink-600">1,800 ₽</div>
          <div className="text-xs text-gray-400 mt-1">20 января 2025</div>
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
        {activeTab === 'orders' && renderOrders()}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'bonuses' && renderBonuses()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2">
        <div className="flex justify-between items-center overflow-x-auto">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'catalog'
                ? 'text-pink-600 bg-pink-50'
                : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <FlowerIcon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Каталог</span>
          </button>
          
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'orders'
                ? 'text-pink-600 bg-pink-50'
                : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <ShoppingBagIcon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Заказы</span>
          </button>
          
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'notifications'
                ? 'text-pink-600 bg-pink-50'
                : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <BellIcon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Уведомления</span>
          </button>
          
          <button
            onClick={() => setActiveTab('bonuses')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'bonuses'
                ? 'text-pink-600 bg-pink-50'
                : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <GiftIcon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Бонусы</span>
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'profile'
                ? 'text-pink-600 bg-pink-50'
                : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <UserIcon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Профиль</span>
          </button>
        </div>
      </div>
    </div>
  )
} 