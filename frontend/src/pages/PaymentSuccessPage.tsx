import { useEffect, useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { Button, Card, Badge, Alert } from '@/components/ui'
import MetricsService from '@/services/metrics'
import SEO from '@/components/SEO'
import { 
  CheckCircle, 
  Package, 
  Clock, 
  MapPin, 
  CreditCard,
  ArrowRight,
  Download,
  MessageCircle,
  Star
} from 'lucide-react'

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(10)

  const orderId = searchParams.get('order_id')
  const paymentId = searchParams.get('payment_id')

  // Fetch order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID not found')
      const response = await apiClient.getOrder(Number(orderId))
      return response.data
    },
    enabled: !!orderId,
  })

  // Track successful purchase
  useEffect(() => {
    if (order && order.items) {
      MetricsService.trackPurchase({
        transaction_id: order.id.toString(),
        value: order.total_amount,
        currency: 'RUB',
        items: order.items.map((item: any) => ({
          id: item.flower_id.toString(),
          name: item.flower_name,
          category: item.flower_category || 'flowers',
          price: item.price,
          quantity: item.quantity
        }))
      })
    }
  }, [order])

  // Auto redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/orders')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Загружаем информацию о заказе...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Ошибка загрузки заказа
          </h1>
          <p className="text-gray-600 mb-6">
            Не удалось загрузить информацию о заказе
          </p>
          <div className="space-y-3">
            <Link to="/orders">
              <Button className="w-full">
                Мои заказы
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="w-full">
                На главную
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <>
      <SEO
        title="Оплата прошла успешно - MSK Flower"
        description="Спасибо за заказ! Мы уже готовим ваши цветы к доставке."
      />
      
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎉 Оплата прошла успешно!
            </h1>
            <p className="text-lg text-gray-600">
              Спасибо за заказ! Мы уже готовим ваши цветы к доставке.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Summary */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Заказ №{order.id}
                  </h2>
                  <Badge color="success">
                    Оплачен
                  </Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      📦 Информация о заказе
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Дата заказа:</span>
                        <span>{new Date(order.created_at).toLocaleDateString('ru-RU')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Количество товаров:</span>
                        <span>{order.items?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Способ оплаты:</span>
                        <span>💳 Банковская карта</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      🚚 Доставка
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Адрес:</span>
                        <span className="text-right">{order.delivery_address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Дата доставки:</span>
                        <span>{new Date(order.delivery_date).toLocaleDateString('ru-RU')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Время:</span>
                        <span>{order.delivery_time || '10:00-18:00'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">Заказанные товары:</h3>
                  <div className="space-y-4">
                    {order.items?.map((item: any, index: number) => (
                      <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-pink-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">🌸</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.flower_name}</h4>
                          <p className="text-sm text-gray-600">
                            {item.quantity} шт. × {item.price}₽
                          </p>
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                          {item.quantity * item.price}₽
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t pt-4 mt-6">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Итого:</span>
                    <span className="text-green-600">{order.total_amount}₽</span>
                  </div>
                </div>
              </Card>

              {/* Next Steps */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  📋 Что происходит дальше?
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Подготовка заказа</p>
                      <p className="text-sm text-gray-600">
                        Наши флористы уже начали готовить ваш заказ
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-yellow-600">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Уведомление о доставке</p>
                      <p className="text-sm text-gray-600">
                        За час до доставки мы пришлем вам SMS с контактами курьера
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-green-600">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Доставка</p>
                      <p className="text-sm text-gray-600">
                        Курьер доставит заказ по указанному адресу в выбранное время
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Полезные ссылки</h3>
                <div className="space-y-3">
                  <Link to="/orders" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Package className="w-4 h-4 mr-2" />
                      Мои заказы
                    </Button>
                  </Link>
                  
                  <Link to="/support" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Поддержка
                    </Button>
                  </Link>
                  
                  <Link to="/catalog" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Заказать еще
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* Auto Redirect */}
              <Card className="p-6 text-center">
                <Clock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  Автоматический переход к заказам через:
                </p>
                <div className="text-2xl font-bold text-blue-600 mb-3">
                  {countdown}с
                </div>
                <Button 
                  size="sm" 
                  onClick={() => navigate('/orders')}
                  className="w-full"
                >
                  Перейти сейчас
                </Button>
              </Card>

              {/* Review Prompt */}
              <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
                <div className="text-center">
                  <Star className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Оставьте отзыв
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    После получения заказа, поделитесь впечатлениями!
                  </p>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    +50 бонусных баллов за отзыв
                  </Badge>
                </div>
              </Card>

              {/* Contact Info */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Контакты</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <span>📞</span>
                    <span>+7 (495) 123-45-67</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>✉️</span>
                    <span>support@mskflower.ru</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>🕒</span>
                    <span>Ежедневно 8:00-22:00</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 