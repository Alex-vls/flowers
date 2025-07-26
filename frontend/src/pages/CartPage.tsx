import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '@/hooks/useCart'
import { useAuth } from '@/hooks/useAuth'
import { 
  Button, 
  Input, 
  Card, 
  Badge, 
  Alert,
  Modal,
  Breadcrumbs,
  Select 
} from '@/components/ui'
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  ArrowLeft,
  Heart,
  Gift,
  Truck,
  CreditCard,
  CheckCircle,
  Clock,
  Calendar,
  MapPin,
  User,
  ChevronRight,
  AlertCircle
} from 'lucide-react'

type CheckoutStep = 'cart' | 'delivery' | 'confirmation'

export default function CartPage() {
  const navigate = useNavigate()
  const { 
    items, 
    updateQuantity, 
    removeItem, 
    clearCart, 
    getTotalPrice, 
    getTotalItems,
    createOrder 
  } = useCart()
  const { isAuthenticated, user } = useAuth()

  // State
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('cart')
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [bonusesToUse, setBonusesToUse] = useState(0)
  const [showClearModal, setShowClearModal] = useState(false)
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)

  // Delivery data
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [deliverySlot, setDeliverySlot] = useState('morning')

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({})

  const subtotal = getTotalPrice()
  const deliveryFee = subtotal > 1000 ? 0 : 200
  const discount = subtotal * promoDiscount / 100
  const bonusDiscount = Math.min(bonusesToUse, subtotal + deliveryFee - discount) // Бонусы не могут превышать стоимость
  const total = Math.max(0, subtotal + deliveryFee - discount - bonusDiscount)

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Каталог', href: '/catalog' },
    { label: 'Корзина' },
  ]

  // Get minimum delivery date (tomorrow)
  const getMinDeliveryDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  // Get maximum delivery date (14 days from now)
  const getMaxDeliveryDate = () => {
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 14)
    return maxDate.toISOString().split('T')[0]
  }

  const deliverySlotOptions = [
    { value: 'morning', label: '🌅 Утро (9:00 - 12:00)' },
    { value: 'afternoon', label: '☀️ День (12:00 - 17:00)' },
    { value: 'evening', label: '🌇 Вечер (17:00 - 21:00)' },
  ]

  const handleQuantityChange = (flowerId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(flowerId)
    } else {
      updateQuantity(flowerId, newQuantity)
    }
  }

  const handleApplyPromo = () => {
    // Mock promo codes
    const promoCodes: Record<string, number> = {
      'WELCOME10': 10,
      'SAVE15': 15,
      'FLOWER20': 20,
    }
    
    const discount = promoCodes[promoCode.toUpperCase()]
    if (discount) {
      setPromoDiscount(discount)
      alert(`Промокод применен! Скидка ${discount}%`)
    } else {
      alert('Неверный промокод')
    }
  }

  const validateDelivery = () => {
    const newErrors: Record<string, string> = {}

    if (!deliveryAddress.trim()) {
      newErrors.deliveryAddress = 'Укажите адрес доставки'
    }

    if (!deliveryDate) {
      newErrors.deliveryDate = 'Выберите дату доставки'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleProceedToDelivery = () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setCurrentStep('delivery')
  }

  const handleProceedToConfirmation = () => {
    if (validateDelivery()) {
      setCurrentStep('confirmation')
    }
  }

  const handleCreateOrder = async () => {
    setIsCreatingOrder(true)
    try {
      const orderData = {
        items: items.map(item => ({
          flower_id: item.flower.id,
          quantity: item.quantity,
          notes: ''
        })),
        delivery_address: deliveryAddress,
        delivery_date: new Date(deliveryDate + 'T12:00:00'),
        delivery_slot: deliverySlot,
        delivery_instructions: deliveryInstructions,
        customer_notes: '',
        bonusPointsUsed: bonusesToUse,
        promoCode: promoCode
      }

      await createOrder(orderData)
      navigate('/orders')
    } catch (error) {
      console.error('Order creation failed:', error)
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {/* Step 1 */}
        <div className={`flex items-center ${currentStep === 'cart' ? 'text-pink-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            currentStep === 'cart' ? 'bg-pink-600 text-white' : 'bg-gray-200'
          }`}>
            1
          </div>
          <span className="ml-2 font-medium">Корзина</span>
        </div>

        <ChevronRight className="w-4 h-4 text-gray-400" />

        {/* Step 2 */}
        <div className={`flex items-center ${currentStep === 'delivery' ? 'text-pink-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            currentStep === 'delivery' ? 'bg-pink-600 text-white' : 'bg-gray-200'
          }`}>
            2
          </div>
          <span className="ml-2 font-medium">Доставка</span>
        </div>

        <ChevronRight className="w-4 h-4 text-gray-400" />

        {/* Step 3 */}
        <div className={`flex items-center ${currentStep === 'confirmation' ? 'text-pink-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            currentStep === 'confirmation' ? 'bg-pink-600 text-white' : 'bg-gray-200'
          }`}>
            3
          </div>
          <span className="ml-2 font-medium">Подтверждение</span>
        </div>
      </div>
    </div>
  )

  const renderCartStep = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => (
          <Card key={item.flower.id} className="p-6">
            <div className="flex items-center space-x-4">
              {/* Product Image */}
              <div className="flex-shrink-0">
                <img
                  src={item.flower.image_url || '/placeholder-flower.jpg'}
                  alt={item.flower.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {item.flower.name}
                    </h3>
                    <p className="text-sm text-gray-600 capitalize">
                      Букет цветов
                    </p>
                    <div className="flex items-center mt-2">
                      <span className="text-lg font-bold text-pink-600">
                        {item.flower.price} ₽
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        за букет
                      </span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.flower.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Quantity and Total */}
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">
                      Количество:
                    </span>
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(item.flower.id, item.quantity - 1)}
                        className="p-2 hover:bg-gray-100 disabled:opacity-50"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(item.flower.id, item.quantity + 1)}
                        className="p-2 hover:bg-gray-100"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {(item.flower.price * item.quantity).toLocaleString()} ₽
                    </div>
                    <div className="text-sm text-gray-500">
                      {item.quantity} × {item.flower.price} ₽
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {/* Promo Code */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Gift className="w-5 h-5 mr-2" />
            Промокод
          </h3>
          <div className="flex space-x-3">
            <Input
              placeholder="Введите промокод"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleApplyPromo}
              variant="outline"
              disabled={!promoCode.trim()}
            >
              Применить
            </Button>
          </div>
          {promoDiscount > 0 && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 text-sm font-medium">
                ✓ Промокод применен! Скидка {promoDiscount}%
              </p>
            </div>
          )}
        </Card>

        {/* Bonus Points */}
        {isAuthenticated && user?.bonus_points && user.bonus_points > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2 text-yellow-500" />
              Бонусные баллы
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Доступно баллов:</span>
                <span className="font-bold text-yellow-600">{user.bonus_points}</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Использовать баллов (1 балл = 1 ₽):
                </label>
                <div className="flex space-x-3">
                  <Input
                    type="number"
                    min="0"
                    max={Math.min(user.bonus_points, subtotal + deliveryFee - discount)}
                    value={bonusesToUse}
                    onChange={(e) => setBonusesToUse(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1"
                    placeholder="0"
                  />
                  <Button
                    onClick={() => setBonusesToUse(Math.min(user.bonus_points, subtotal + deliveryFee - discount))}
                    variant="outline"
                    size="sm"
                  >
                    Макс
                  </Button>
                </div>
              </div>
              
              {bonusesToUse > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800 text-sm font-medium">
                    ✓ Будет списано {bonusesToUse} баллов (-{bonusesToUse} ₽)
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Итого заказа</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Товары ({getTotalItems()} шт.)</span>
                <span>{subtotal.toLocaleString()} ₽</span>
              </div>
              
              <div className="flex justify-between">
                <span>Доставка</span>
                <span className={deliveryFee === 0 ? 'text-green-600' : ''}>
                  {deliveryFee === 0 ? 'Бесплатно' : `${deliveryFee} ₽`}
                </span>
              </div>

              {promoDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Скидка ({promoDiscount}%)</span>
                  <span>-{discount.toLocaleString()} ₽</span>
                </div>
              )}

              {bonusDiscount > 0 && (
                <div className="flex justify-between text-yellow-600">
                  <span>Бонусы ({bonusesToUse} баллов)</span>
                  <span>-{bonusDiscount.toLocaleString()} ₽</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>К оплате</span>
                  <span>{total.toLocaleString()} ₽</span>
                </div>
                {bonusesToUse > 0 && (
                  <div className="text-sm text-gray-500 mt-1">
                    Будет начислено {Math.round(total * 0.05)} бонусов за заказ
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <Truck className="w-4 h-4 mr-2" />
                <span>Доставка по Москве</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 mr-2" />
                <span>Бесплатная доставка от 1000 ₽</span>
              </div>
            </div>

            {/* Proceed Button */}
            <Button
              onClick={handleProceedToDelivery}
              className="w-full bg-pink-600 hover:bg-pink-700 py-4 text-lg font-semibold"
              size="lg"
            >
              <ChevronRight className="w-5 h-5 mr-2" />
              Продолжить
            </Button>

            {!isAuthenticated && (
              <Alert className="mt-4">
                <p className="text-sm">
                  <Link to="/login" className="text-pink-600 hover:underline">
                    Войдите в аккаунт
                  </Link>
                  {' '}для оформления заказа
                </p>
              </Alert>
            )}

            {/* Continue Shopping */}
            <Button
              variant="outline"
              onClick={() => navigate('/catalog')}
              className="w-full mt-3"
            >
              Продолжить покупки
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )

  const renderDeliveryStep = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Delivery Form */}
      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Адрес доставки
          </h3>
          <Input
            placeholder="Введите адрес доставки"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            className={errors.deliveryAddress ? 'border-red-500' : ''}
            required
          />
          {errors.deliveryAddress && (
            <p className="text-red-500 text-sm mt-1">{errors.deliveryAddress}</p>
          )}
          <textarea
            placeholder="Инструкции для курьера (необязательно)"
            value={deliveryInstructions}
            onChange={(e) => setDeliveryInstructions(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent mt-4"
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Дата доставки
          </h3>
          <Input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            min={getMinDeliveryDate()}
            max={getMaxDeliveryDate()}
            className={errors.deliveryDate ? 'border-red-500' : ''}
            required
          />
          {errors.deliveryDate && (
            <p className="text-red-500 text-sm mt-1">{errors.deliveryDate}</p>
          )}
          <p className="text-sm text-gray-600 mt-2">
            Доставка возможна завтра и позже
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Время доставки
          </h3>
          <Select
            value={deliverySlot}
            onChange={setDeliverySlot}
            options={deliverySlotOptions}
          />
          <p className="text-sm text-gray-600 mt-2">
            Выберите удобное время для получения заказа
          </p>
        </Card>
      </div>

      {/* Order Summary */}
      <div>
        <div className="sticky top-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Детали заказа</h3>
            
            {/* Items Summary */}
            <div className="space-y-2 mb-4">
              {items.map((item) => (
                <div key={item.flower.id} className="flex justify-between text-sm">
                  <span>{item.flower.name} × {item.quantity}</span>
                  <span>{(item.flower.price * item.quantity).toLocaleString()} ₽</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-2 mb-6">
              <div className="flex justify-between">
                <span>Товары</span>
                <span>{subtotal.toLocaleString()} ₽</span>
              </div>
              <div className="flex justify-between">
                <span>Доставка</span>
                <span className={deliveryFee === 0 ? 'text-green-600' : ''}>
                  {deliveryFee === 0 ? 'Бесплатно' : `${deliveryFee} ₽`}
                </span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Скидка</span>
                  <span>-{discount.toLocaleString()} ₽</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Итого</span>
                <span>{total.toLocaleString()} ₽</span>
              </div>
            </div>

            {/* Navigation */}
            <div className="space-y-3">
              <Button
                onClick={handleProceedToConfirmation}
                className="w-full bg-pink-600 hover:bg-pink-700"
              >
                Продолжить
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentStep('cart')}
                className="w-full"
              >
                Назад в корзину
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )

  const renderConfirmationStep = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Order Details */}
      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Ваш заказ
          </h3>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.flower.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <img
                  src={item.flower.image_url || '/placeholder-flower.jpg'}
                  alt={item.flower.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h4 className="font-medium">{item.flower.name}</h4>
                  <p className="text-sm text-gray-600">
                    Количество: {item.quantity} × {item.flower.price} ₽
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{(item.flower.price * item.quantity).toLocaleString()} ₽</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Truck className="w-5 h-5 mr-2" />
            Доставка
          </h3>
          <div className="space-y-3">
            <div>
              <p className="font-medium">Адрес:</p>
              <p className="text-gray-600">{deliveryAddress}</p>
            </div>
            <div>
              <p className="font-medium">Дата:</p>
              <p className="text-gray-600">
                {new Date(deliveryDate).toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="font-medium">Время:</p>
              <p className="text-gray-600">
                {deliverySlotOptions.find(slot => slot.value === deliverySlot)?.label}
              </p>
            </div>
            {deliveryInstructions && (
              <div>
                <p className="font-medium">Инструкции:</p>
                <p className="text-gray-600">{deliveryInstructions}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Получатель
          </h3>
          <div className="space-y-2">
            <p><span className="font-medium">Имя:</span> {user?.full_name}</p>
            <p><span className="font-medium">Телефон:</span> {user?.phone || 'Не указан'}</p>
            <p><span className="font-medium">Email:</span> {user?.email}</p>
          </div>
        </Card>
      </div>

      {/* Final Summary */}
      <div>
        <div className="sticky top-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Подтверждение заказа</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Товары ({getTotalItems()} шт.)</span>
                <span>{subtotal.toLocaleString()} ₽</span>
              </div>
              <div className="flex justify-between">
                <span>Доставка</span>
                <span className={deliveryFee === 0 ? 'text-green-600' : ''}>
                  {deliveryFee === 0 ? 'Бесплатно' : `${deliveryFee} ₽`}
                </span>
              </div>
              {promoDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Скидка ({promoDiscount}%)</span>
                  <span>-{discount.toLocaleString()} ₽</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>К оплате</span>
                  <span>{total.toLocaleString()} ₽</span>
                </div>
              </div>
            </div>

            <Alert className="mb-6">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm">
                После подтверждения заказа вам будет отправлено уведомление с деталями и ссылкой для оплаты.
              </p>
            </Alert>

            {/* Navigation */}
            <div className="space-y-3">
              <Button
                onClick={handleCreateOrder}
                disabled={isCreatingOrder}
                className="w-full bg-pink-600 hover:bg-pink-700 py-4 text-lg font-semibold"
                size="lg"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                {isCreatingOrder ? 'Создание заказа...' : 'Подтвердить заказ'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentStep('delivery')}
                className="w-full"
                disabled={isCreatingOrder}
              >
                Изменить доставку
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbItems} className="mb-6" />
        
        <div className="text-center py-16">
          <ShoppingCart className="mx-auto h-24 w-24 text-gray-300 mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ваша корзина пуста
          </h2>
          <p className="text-gray-600 mb-8">
            Добавьте товары из каталога, чтобы оформить заказ
          </p>
          <Button 
            onClick={() => navigate('/catalog')}
            className="bg-pink-600 hover:bg-pink-700"
          >
            Перейти в каталог
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={breadcrumbItems} className="mb-6" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => {
              if (currentStep === 'delivery') {
                setCurrentStep('cart')
              } else if (currentStep === 'confirmation') {
                setCurrentStep('delivery')
              } else {
                navigate(-1)
              }
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {currentStep === 'cart' && `Корзина (${getTotalItems()} товар${getTotalItems() !== 1 ? (getTotalItems() < 5 ? 'а' : 'ов') : ''})`}
            {currentStep === 'delivery' && 'Доставка'}
            {currentStep === 'confirmation' && 'Подтверждение заказа'}
          </h1>
        </div>
        
        {currentStep === 'cart' && (
          <Button
            variant="outline"
            onClick={() => setShowClearModal(true)}
            className="text-gray-600 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Очистить корзину
          </Button>
        )}
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Step Content */}
      {currentStep === 'cart' && renderCartStep()}
      {currentStep === 'delivery' && renderDeliveryStep()}
      {currentStep === 'confirmation' && renderConfirmationStep()}

      {/* Clear Cart Modal */}
      <Modal
        open={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Очистить корзину?"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Вы уверены, что хотите удалить все товары из корзины? 
            Это действие нельзя отменить.
          </p>
          <div className="flex space-x-3">
            <Button
              onClick={() => {
                clearCart()
                setShowClearModal(false)
              }}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Очистить
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowClearModal(false)}
              className="flex-1"
            >
              Отмена
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
} 