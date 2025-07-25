import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { Flower } from '@/types'
import { FlowerCard } from '@/components/catalog'
import { LoadingSpinner, Alert } from '@/components/ui'
import { Flower as FlowerIcon, ShoppingCart, User, Calendar } from 'lucide-react'

declare global {
  interface Window {
    Telegram: {
      WebApp: {
        initData: string
        initDataUnsafe: any
        colorScheme: string
        themeParams: any
        isExpanded: boolean
        viewportHeight: number
        viewportStableHeight: number
        headerColor: string
        backgroundColor: string
        BackButton: {
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
        }
        MainButton: {
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
          onClick: (callback: () => void) => void
        }
        HapticFeedback: {
          impactOccurred: (style: string) => void
          notificationOccurred: (type: string) => void
          selectionChanged: () => void
        }
        expand: () => void
        close: () => void
        ready: () => void
      }
    }
  }
}

export default function TelegramApp() {
  const [isTelegramApp, setIsTelegramApp] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Fetch featured flowers
  const { data: flowers, isLoading, error } = useQuery({
    queryKey: ['telegram-featured-flowers'],
    queryFn: async () => {
      const response = await apiClient.getFlowers({ featured: true, limit: 6 })
      return response.data.items
    },
  })

  useEffect(() => {
    // Check if running in Telegram WebApp
    if (window.Telegram?.WebApp) {
      setIsTelegramApp(true)
      
      // Initialize Telegram WebApp
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
      
      // Set theme
      const theme = window.Telegram.WebApp.colorScheme
      document.documentElement.setAttribute('data-theme', theme)
      
      // Get user data
      const initData = window.Telegram.WebApp.initDataUnsafe
      if (initData?.user) {
        setUser(initData.user)
      }
      
      // Setup main button
      window.Telegram.WebApp.MainButton.text = 'Открыть сайт'
      window.Telegram.WebApp.MainButton.color = '#16a34a'
      window.Telegram.WebApp.MainButton.textColor = '#ffffff'
      window.Telegram.WebApp.MainButton.onClick(() => {
        window.open('https://msk-flower.su', '_blank')
      })
      window.Telegram.WebApp.MainButton.show()
    }
  }, [])

  const handleFlowerClick = (flower: Flower) => {
    if (isTelegramApp) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium')
    }
    // Navigate to flower details
    window.open(`https://msk-flower.su/flower/${flower.id}`, '_blank')
  }

  const handleAddToCart = (flower: Flower) => {
    if (isTelegramApp) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light')
    }
    // Add to cart logic
    console.log('Add to cart:', flower.id)
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert type="error" title="Ошибка загрузки">
          Не удалось загрузить каталог цветов
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-green-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-rose-500 rounded-lg flex items-center justify-center">
              <FlowerIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">MSK Flower</h1>
              <p className="text-sm text-gray-600">Ежедневная доставка цветов</p>
            </div>
          </div>
          {user && (
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-700">{user.first_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => window.open('https://msk-flower.su/catalog', '_blank')}
            className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <FlowerIcon className="w-6 h-6 text-green-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Каталог</span>
          </button>
          
          <button
            onClick={() => window.open('https://msk-flower.su/subscription', '_blank')}
            className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <Calendar className="w-6 h-6 text-pink-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Подписка</span>
          </button>
          
          <button
            onClick={() => window.open('https://msk-flower.su/cart', '_blank')}
            className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <ShoppingCart className="w-6 h-6 text-rose-600 mb-2" />
            <span className="text-sm font-medium text-gray-900">Корзина</span>
          </button>
        </div>

        {/* Featured Flowers */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Популярные цветы</h2>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : flowers && flowers.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {flowers.map((flower: Flower) => (
                <div
                  key={flower.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={flower.image_url || '/placeholder-flower.jpg'}
                      alt={flower.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-1">
                      {flower.name}
                    </h3>
                    <p className="text-lg font-bold text-green-600 mb-2">
                      {flower.price} ₽
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleFlowerClick(flower)}
                        className="flex-1 bg-green-600 text-white text-sm py-2 px-3 rounded-md hover:bg-green-700 transition-colors"
                      >
                        Подробнее
                      </button>
                      <button
                        onClick={() => handleAddToCart(flower)}
                        className="bg-pink-600 text-white text-sm py-2 px-3 rounded-md hover:bg-pink-700 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Нет доступных цветов
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-2">О сервисе</h3>
          <p className="text-sm text-gray-600 mb-3">
            MSK Flower доставляет свежие цветы каждый день прямо к вашему столу. 
            Выберите подписку или закажите отдельные букеты.
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-900">Доставка</p>
              <p className="text-gray-600">8:00 - 22:00</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">Зона</p>
              <p className="text-gray-600">Москва и область</p>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-2">
            Нужна помощь? Обратитесь в поддержку
          </p>
          <button
            onClick={() => window.open('https://t.me/Flower_Moscow_appbot', '_blank')}
            className="text-green-600 hover:text-green-700 text-sm font-medium"
          >
            @Flower_Moscow_appbot
          </button>
        </div>
      </div>
    </div>
  )
} 