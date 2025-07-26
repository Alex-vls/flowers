import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useCart } from '@/hooks/useCart'
import api from '@/lib/api'
import { Flower } from '@/types'
import { LoadingSpinner, Alert, Button, Badge } from '@/components/ui'
import { 
  Flower as FlowerIcon, 
  ShoppingCart, 
  User, 
  Calendar, 
  Phone,
  Plus,
  Heart,
  Star,
  Package,
  MapPin,
  CreditCard,
  Gift,
  Settings,
  LogOut,
  Truck
} from 'lucide-react'

// Telegram WebApp types are declared in LoginPage.tsx

type TabType = 'catalog' | 'contacts' | 'subscription' | 'profile'

export default function TelegramApp() {
  const [isTelegramApp, setIsTelegramApp] = useState(false)
  const [telegramUser, setTelegramUser] = useState<any>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('catalog')
  const { user, isAuthenticated, login, logout } = useAuth()
  const { addToCart, items: cartItems } = useCart()
  const queryClient = useQueryClient()

  // Fetch flowers for catalog
  const { data: flowers, isLoading, error } = useQuery({
    queryKey: ['telegram-flowers'],
    queryFn: async () => {
      const response = await api.get('/flowers', { params: { limit: 20 } })
      return response.data || []
    },
  })

  // Fetch subscriptions for authenticated user
  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ['user-subscriptions'],
    queryFn: async () => {
      if (!isAuthenticated) return []
      const response = await api.get('/subscriptions/')
      return response.data || []
    },
    enabled: isAuthenticated,
  })

  // Add to subscription mutation
  const addToSubscriptionMutation = useMutation({
    mutationFn: async (flowerId: number) => {
      const response = await api.post('/subscriptions/', {
        flower_ids: [flowerId],
        frequency: 'weekly',
        delivery_address: user?.address || '',
        start_date: new Date().toISOString().split('T')[0]
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscriptions'] })
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      alert('Цветок добавлен в подписку!')
    },
    onError: () => {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error')
      alert('Ошибка добавления в подписку')
    }
  })

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      setIsTelegramApp(true)
      const tg = window.Telegram.WebApp
      
      tg.ready()
      tg.expand()
      
      // Apply Telegram theme
      const isDark = tg.colorScheme === 'dark'
      document.documentElement.classList.toggle('dark', isDark)
      
      // Setup main button
      tg.MainButton.setText('Посмотреть корзину')
      tg.MainButton.onClick(() => {
        setActiveTab('catalog')
        // Show cart summary or navigate to cart
      })

      // Get user data from Telegram
      if (tg.initDataUnsafe?.user) {
        setTelegramUser(tg.initDataUnsafe.user)
        
        // Auto-authenticate if user data is available and valid
        if (!isAuthenticated && tg.initDataUnsafe.user.id) {
          authenticateUser(tg.initDataUnsafe.user)
        }
      }

      // Haptic feedback on interactions
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')
    }
  }, [isAuthenticated])

  // Update main button based on cart
  useEffect(() => {
    if (window.Telegram?.WebApp?.MainButton && cartItems.length > 0) {
      const tg = window.Telegram.WebApp
      tg.MainButton.setText(`Корзина (${cartItems.length})`)
      tg.MainButton.show()
    }
  }, [cartItems])

  const authenticateUser = async (telegramUserData: any) => {
    setIsAuthenticating(true)
    try {
      // Получаем полные initData от Telegram WebApp
      const tg = window.Telegram?.WebApp
      if (!tg?.initData) {
        throw new Error('Telegram initData not available')
      }

      // Используем новый endpoint для Mini App с проверкой initData
      const response = await api.post('/auth/telegram-miniapp', {
        init_data: tg.initData,
        init_data_hash: new URLSearchParams(tg.initData).get('hash') || ''
      })

      const data = response.data
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      login(data.user, data.access_token)
      
      console.log(`🎉 Telegram Mini App auth successful! Method: ${data.auth_method}`)
    } catch (error) {
      console.error('Auto-authentication failed:', error)
      // Fallback: попробуем старый метод для совместимости
      try {
        const response = await api.post('/auth/telegram-auth', {
          telegram_id: telegramUserData.id.toString(),
          first_name: telegramUserData.first_name,
          last_name: telegramUserData.last_name || null
        })

        const data = response.data
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        login(data.user, data.access_token)
        
        console.log('🔄 Fallback auth successful')
      } catch (fallbackError) {
        console.error('Fallback authentication also failed:', fallbackError)
      }
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleAddToCart = (flower: Flower) => {
    addToCart(flower, 1)
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium')
  }

  const handleAddToSubscription = (flower: Flower) => {
    if (!isAuthenticated) {
      alert('Войдите в аккаунт для создания подписки')
      return
    }
    addToSubscriptionMutation.mutate(flower.id)
  }

  const renderCatalog = () => (
    <div className="pb-20 pt-4">{/* Убрали header - только отступ сверху */}

      {/* Quick Stats */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <Package className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <div className="text-sm font-semibold text-gray-900">{flowers?.length || 0}</div>
            <div className="text-xs text-gray-600">Видов цветов</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <Truck className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <div className="text-sm font-semibold text-gray-900">2-4 часа</div>
            <div className="text-xs text-gray-600">Доставка</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <Gift className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <div className="text-sm font-semibold text-gray-900">Бесплатно</div>
            <div className="text-xs text-gray-600">От 1000₽</div>
          </div>
        </div>
      </div>

      {/* Catalog */}
      <div className="px-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Популярные цветы</h2>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
            <LoadingSpinner />
            </div>
        ) : error ? (
          <Alert type="error">
            Не удалось загрузить каталог цветов
          </Alert>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {flowers?.map((flower: Flower) => {
              const averageRating = 4.2 + Math.random() * 0.8
              const reviewCount = Math.floor(Math.random() * 50) + 1
              const isInStock = flower.is_available
              
              return (
                <div key={flower.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="flex">
                    {/* Image */}
                    <div className="w-24 h-24 flex-shrink-0">
                      <div className="w-full h-full bg-gradient-to-br from-green-50 to-pink-50 relative rounded-l-2xl">
                        {flower.image_url ? (
                          <img 
                            src={flower.image_url} 
                      alt={flower.name}
                            className="w-full h-full object-cover rounded-l-2xl"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FlowerIcon className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Status badge */}
                        <div className="absolute top-1 left-1">
                          <div className={`w-2 h-2 rounded-full ${
                            isInStock ? 'bg-green-400' : 'bg-red-400'
                          }`} />
                        </div>
                      </div>
                  </div>

                    {/* Content */}
                    <div className="flex-1 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">
                      {flower.name}
                    </h3>
                          <p className="text-xs text-gray-500 capitalize">
                            {flower.category}
                          </p>
                        </div>
                        <div className="text-lg font-bold text-pink-600 ml-2">
                          ₽{flower.price}
                        </div>
                      </div>
                      
                      {/* Rating */}
                      <div className="flex items-center mb-3">
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3 h-3 ${
                                star <= Math.floor(averageRating)
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-600 ml-2">
                          {averageRating.toFixed(1)} ({reviewCount})
                        </span>
                      </div>

                      {/* Action buttons */}
                    <div className="flex space-x-2">
                        <Button
                          onClick={() => handleAddToCart(flower)}
                          disabled={!isInStock}
                          className="flex-1 bg-pink-500 hover:bg-pink-600 text-white py-2 text-xs font-medium"
                          size="sm"
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          Купить
                        </Button>
                        <Button
                          onClick={() => handleAddToSubscription(flower)}
                          disabled={!isInStock || !isAuthenticated}
                          variant="outline"
                          className="flex-1 border-pink-200 text-pink-600 hover:bg-pink-50 py-2 text-xs font-medium"
                          size="sm"
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          Подписка
                        </Button>
                      </div>

                      {/* Additional info */}
                      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                        <span>👀 {flower.views_count}</span>
                        <span>🛒 {flower.orders_count}</span>
                        {flower.is_seasonal && (
                          <span className="text-orange-600">🍃 Сезонный</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          )}
        </div>
    </div>
  )

  const renderContacts = () => (
    <div className="p-4 pb-20">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Контакты</h2>
      
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <Phone className="w-6 h-6 text-pink-500 mr-3" />
            <div>
              <h3 className="font-semibold text-gray-900">Телефон</h3>
              <p className="text-gray-600">+7 (495) 123-45-67</p>
            </div>
          </div>
          <Button
            onClick={() => window.open('tel:+74951234567')}
            className="w-full bg-green-500 hover:bg-green-600"
          >
            Позвонить
          </Button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <MapPin className="w-6 h-6 text-pink-500 mr-3" />
            <div>
              <h3 className="font-semibold text-gray-900">Адрес</h3>
              <p className="text-gray-600">г. Москва, ул. Цветочная, 1</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-2">Время работы</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Пн-Пт: 8:00 - 22:00</p>
            <p>Сб-Вс: 9:00 - 21:00</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-2xl p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Доставка</h3>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center">
              <Truck className="w-4 h-4 mr-2 text-pink-500" />
              <span>Бесплатная доставка от 1000₽</span>
            </div>
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-pink-500" />
              <span>Доставка в день заказа</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSubscription = () => (
    <div className="p-4 pb-20">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Подписки</h2>
      
      {!isAuthenticated ? (
        <div className="text-center py-8">
          <Calendar className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Войдите в аккаунт
          </h3>
          <p className="text-gray-600 mb-4">
            Для управления подписками необходима авторизация
          </p>
        </div>
      ) : subscriptionsLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : subscriptions?.length > 0 ? (
        <div className="space-y-4">
          {subscriptions.map((subscription: any) => (
            <div key={subscription.id} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{subscription.name}</h3>
                  <p className="text-sm text-gray-600">{subscription.frequency}</p>
                </div>
                <Badge color={subscription.status === 'active' ? 'success' : 'warning'}>
                  {subscription.status === 'active' ? 'Активна' : 'Приостановлена'}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-pink-600">
                  ₽{subscription.price_per_delivery}
                </span>
                <Button size="sm" variant="outline">
                  Управлять
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Calendar className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Нет активных подписок
          </h3>
          <p className="text-gray-600 mb-4">
            Создайте подписку из каталога цветов
          </p>
          <Button 
            onClick={() => setActiveTab('catalog')}
            className="bg-pink-500 hover:bg-pink-600"
          >
            Перейти в каталог
          </Button>
        </div>
      )}
    </div>
  )

  const renderProfile = () => (
    <div className="p-4 pb-20">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Профиль</h2>
      
      {!isAuthenticated ? (
        <div className="text-center py-8">
          <User className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Войдите в аккаунт
          </h3>
          <p className="text-gray-600 mb-4">
            Для доступа к профилю необходима авторизация
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* User Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mr-4">
                <User className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {user?.full_name || telegramUser?.first_name}
                </h3>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            
            {/* Loyalty & Bonuses */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Gift className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="font-medium text-gray-900">Программа лояльности</span>
                </div>
                <Star className="w-4 h-4 text-yellow-500" />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {user?.bonus_points || 0}
                  </div>
                  <div className="text-xs text-gray-600">бонусных баллов</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">
                    {user?.bonus_points >= 5000 ? 'Платиновый' : 
                     user?.bonus_points >= 1500 ? 'VIP' :
                     user?.bonus_points >= 500 ? 'Постоянный' : 'Новичок'}
                  </div>
                  <div className="text-xs text-gray-600">ваш уровень</div>
                </div>
              </div>
              
              {user?.bonus_points > 0 && (
                <div className="text-xs text-gray-600 mt-2">
                  1 балл = 1 ₽ при оплате заказа
                </div>
              )}
            </div>
          </div>

          {/* Menu Items */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center">
                <Package className="w-5 h-5 text-gray-600 mr-3" />
                <span>Мои заказы</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
            
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-t border-gray-100">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-600 mr-3" />
                <span>Подписки</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
            
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-t border-gray-100">
              <div className="flex items-center">
                <CreditCard className="w-5 h-5 text-gray-600 mr-3" />
                <span>Способы оплаты</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
            
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 border-t border-gray-100">
              <div className="flex items-center">
                <Settings className="w-5 h-5 text-gray-600 mr-3" />
                <span>Настройки</span>
              </div>
              <span className="text-gray-400">›</span>
            </button>
          </div>

          {/* Logout */}
          <div className="bg-white rounded-2xl shadow-sm">
            <button 
              onClick={logout}
              className="w-full flex items-center justify-center p-4 text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5 mr-2" />
              <span>Выйти</span>
          </button>
          </div>
        </div>
      )}
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'catalog':
        return renderCatalog()
      case 'contacts':
        return renderContacts()
      case 'subscription':
        return renderSubscription()
      case 'profile':
        return renderProfile()
      default:
        return renderCatalog()
    }
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert type="error">
          Не удалось загрузить приложение
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Content */}
      <div className="min-h-screen">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb">
        <div className="flex justify-around">
          {[
            { id: 'catalog', icon: FlowerIcon, label: 'Каталог' },
            { id: 'contacts', icon: Phone, label: 'Контакты' },
            { id: 'subscription', icon: Calendar, label: 'Подписки' },
            { id: 'profile', icon: User, label: 'Профиль' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType)
                window.Telegram?.WebApp?.HapticFeedback?.selectionChanged()
              }}
              className={`flex flex-col items-center space-y-1 py-2 px-3 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'text-pink-600 bg-pink-50'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
} 