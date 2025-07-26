import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Card, 
  Button, 
  Badge, 
  Alert, 
  Modal, 
  Input, 
  Select,
  Breadcrumbs 
} from '@/components/ui'
import TelegramLoginWidget from '@/components/TelegramLoginWidget'
import api from '@/lib/api'
import MetricsService from '@/services/metrics'
import SEO from '@/components/SEO'
import { 
  Calendar, 
  Clock, 
  Pause, 
  Play, 
  Trash2, 
  Plus, 
  Settings,
  MapPin,
  Package,
  CreditCard,
  Star,
  Edit,
  X,
  Check,
  Gift,
  Truck,
  User,
  Heart,
  FlowerIcon as Flower2
} from 'lucide-react'
import type { Flower, Subscription } from '@/types'

type SubscriptionStep = 'list' | 'create' | 'select-flowers' | 'configure' | 'edit'

interface SubscriptionForm {
  name: string
  description: string
  flower_ids: number[]
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  custom_days?: number[]
  quantity_per_delivery: number
  delivery_address: string
  delivery_slot: 'morning' | 'afternoon' | 'evening'
  delivery_instructions?: string
  auto_renew: boolean
  start_date: string
}

export default function SubscriptionPage() {
  const { user, isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [currentStep, setCurrentStep] = useState<SubscriptionStep>('list')
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [selectedFlowers, setSelectedFlowers] = useState<Flower[]>([])
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [subscriptionForm, setSubscriptionForm] = useState<SubscriptionForm>({
    name: '',
    description: '',
    flower_ids: [],
    frequency: 'weekly',
    quantity_per_delivery: 1,
    delivery_address: user?.address || '',
    delivery_slot: 'morning',
    delivery_instructions: '',
    auto_renew: true,
    start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Tomorrow
  })

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Профиль', href: '/profile' },
    { label: 'Подписки' },
  ]

  // Load flowers for selection
  const { data: flowers } = useQuery({
    queryKey: ['flowers-for-subscription'],
    queryFn: async () => {
      const response = await api.get('/flowers')
      return response.data || []
    },
  })

  // Load user subscriptions
  const { data: subscriptions = [], isLoading: subscriptionsLoading, refetch: refetchSubscriptions } = useQuery({
    queryKey: ['user-subscriptions'],
    queryFn: async () => {
      if (!isAuthenticated) return []
      const response = await api.get('/subscriptions/')
      return response.data || []
    },
    enabled: isAuthenticated,
  })

  // Create subscription mutation
  const createSubscriptionMutation = useMutation({
    mutationFn: async (data: SubscriptionForm) => {
      const response = await api.post('/subscriptions/', data)
      return response.data
    },
    onSuccess: () => {
      MetricsService.trackPurchase({
        transaction_id: `sub_${Date.now()}`,
        value: subscriptionForm.quantity_per_delivery * 500, // Estimated value
        currency: 'RUB',
        items: selectedFlowers.map(flower => ({
          id: flower.id.toString(),
          name: flower.name,
          category: flower.category || 'flowers',
          price: flower.price,
          quantity: subscriptionForm.quantity_per_delivery
        }))
      })
      
      refetchSubscriptions()
      setCurrentStep('list')
      resetForm()
      alert('Подписка создана успешно!')
    },
    onError: (error: any) => {
      setError(error.response?.data?.detail || 'Ошибка создания подписки')
    },
  })

  // Subscription control mutations
  const pauseSubscriptionMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/subscriptions/${id}/pause`)
    },
    onSuccess: () => {
      refetchSubscriptions()
      alert('Подписка приостановлена')
    },
  })

  const resumeSubscriptionMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/subscriptions/${id}/resume`)
    },
    onSuccess: () => {
      refetchSubscriptions()
      alert('Подписка возобновлена')
    },
  })

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/subscriptions/${id}`)
    },
    onSuccess: () => {
      refetchSubscriptions()
      alert('Подписка отменена')
    },
  })

  const resetForm = () => {
    setSubscriptionForm({
      name: '',
      description: '',
      flower_ids: [],
      frequency: 'weekly',
      quantity_per_delivery: 1,
      delivery_address: user?.address || '',
      delivery_slot: 'morning',
      delivery_instructions: '',
      auto_renew: true,
      start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    })
    setSelectedFlowers([])
    setEditingSubscription(null)
  }

  const handleTelegramAuth = async (telegramUser: any) => {
    try {
      const response = await api.post('/auth/telegram-auth', {
        telegram_id: telegramUser.id.toString(),
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name || null
      })

      const data = response.data
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)

      login(data.user, data.access_token)
      setShowAuthModal(false)
      
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Ошибка авторизации')
    }
  }

  const handleCreateSubscription = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }
    setCurrentStep('select-flowers')
  }

  const handleFlowerSelection = (flower: Flower) => {
    const isSelected = selectedFlowers.find(f => f.id === flower.id)
    if (isSelected) {
      setSelectedFlowers(prev => prev.filter(f => f.id !== flower.id))
    } else {
      setSelectedFlowers(prev => [...prev, flower])
    }
  }

  const handleContinueToConfig = () => {
    if (selectedFlowers.length === 0) {
      alert('Выберите хотя бы один цветок')
      return
    }
    
    setSubscriptionForm(prev => ({
      ...prev,
      flower_ids: selectedFlowers.map(f => f.id),
      name: selectedFlowers.length === 1 
        ? `Подписка на ${selectedFlowers[0].name}`
        : `Подписка на цветы (${selectedFlowers.length} видов)`
    }))
    
    setCurrentStep('configure')
  }

  const handleSubmitSubscription = () => {
    if (!subscriptionForm.name.trim()) {
      alert('Укажите название подписки')
      return
    }
    if (!subscriptionForm.delivery_address.trim()) {
      alert('Укажите адрес доставки')
      return
    }
    
    createSubscriptionMutation.mutate(subscriptionForm)
  }

  const renderStepIndicator = () => {
    if (currentStep === 'list') return null
    
    const steps = [
      { id: 'select-flowers', label: 'Выбор цветов', current: currentStep === 'select-flowers' },
      { id: 'configure', label: 'Настройки', current: currentStep === 'configure' },
    ]

    return (
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className={`flex items-center ${step.current ? 'text-pink-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step.current ? 'bg-pink-600 text-white' : 'bg-gray-200'
                }`}>
                  {index + 1}
                </div>
                <span className="ml-2 font-medium">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className="w-8 h-px bg-gray-300" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    )
  }

  const renderSubscriptionCard = (subscription: Subscription) => (
    <Card key={subscription.id} className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold">{subscription.name}</h3>
            <Badge className={getStatusColor(subscription.status)}>
              {getStatusLabel(subscription.status)}
            </Badge>
          </div>
          {subscription.description && (
            <p className="text-sm text-gray-600 mb-3">{subscription.description}</p>
          )}
        </div>
      </div>

      {/* Subscription Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">{getFrequencyLabel(subscription.frequency)}</div>
              <div className="text-xs text-gray-500">Частота доставки</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">{subscription.quantity_per_delivery} шт.</div>
              <div className="text-xs text-gray-500">За доставку</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">
                {subscription.delivery_slot === 'morning' ? 'Утром' :
                 subscription.delivery_slot === 'afternoon' ? 'Днем' : 'Вечером'}
              </div>
              <div className="text-xs text-gray-500">Время доставки</div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">{subscription.price_per_delivery} ₽</div>
              <div className="text-xs text-gray-500">За доставку</div>
            </div>
          </div>
        </div>
      </div>

      {/* Next Delivery */}
      {subscription.next_delivery_date && subscription.status === 'active' && (
        <div className="bg-green-50 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-sm font-medium text-green-800">Следующая доставка</div>
              <div className="text-sm text-green-600">
                {new Date(subscription.next_delivery_date).toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Address */}
      <div className="flex items-start space-x-2 mb-4">
        <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
        <div className="text-sm text-gray-600">{subscription.delivery_address}</div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        {subscription.status === 'active' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => pauseSubscriptionMutation.mutate(subscription.id)}
            disabled={pauseSubscriptionMutation.isPending}
            className="flex-1"
          >
            <Pause className="w-4 h-4 mr-1" />
            Пауза
          </Button>
        ) : subscription.status === 'paused' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => resumeSubscriptionMutation.mutate(subscription.id)}
            disabled={resumeSubscriptionMutation.isPending}
            className="flex-1 text-green-600 hover:text-green-700"
          >
            <Play className="w-4 h-4 mr-1" />
            Возобновить
          </Button>
        ) : null}
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditingSubscription(subscription)
            setCurrentStep('edit')
          }}
        >
          <Edit className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            if (confirm('Вы уверены, что хотите отменить подписку?')) {
              cancelSubscriptionMutation.mutate(subscription.id)
            }
          }}
          disabled={cancelSubscriptionMutation.isPending}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  )

  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Ежедневно'
      case 'weekly': return 'Еженедельно'
      case 'monthly': return 'Ежемесячно'
      case 'custom': return 'По расписанию'
      default: return frequency
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Активна'
      case 'paused': return 'Приостановлена'
      case 'cancelled': return 'Отменена'
      default: return status
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <SEO 
          title="Подписки на цветы - MSK Flower"
          description="Управляйте подписками на регулярную доставку свежих цветов"
        />
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Авторизуйтесь для управления подписками
        </h2>
        <p className="text-gray-600 mb-8">
          Войдите в аккаунт чтобы создавать и управлять подписками на доставку цветов
        </p>
        <Button 
          onClick={() => navigate('/login')}
          className="bg-pink-600 hover:bg-pink-700"
        >
          Войти в аккаунт
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <SEO 
        title="Мои подписки - MSK Flower"
        description="Управляйте подписками на регулярную доставку свежих цветов. Создавайте, редактируйте и контролируйте ваши цветочные подписки."
      />
      
      <Breadcrumbs items={breadcrumbItems} className="mb-6" />

      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Calendar className="w-8 h-8 mr-3 text-pink-600" />
              {currentStep === 'list' ? 'Мои подписки' : 
               currentStep === 'select-flowers' ? 'Выберите цветы' :
               currentStep === 'configure' ? 'Настройки подписки' : 'Редактирование'}
            </h1>
            <p className="text-gray-600 mt-1">
              {currentStep === 'list' ? 'Управление подписками на доставку цветов' : 
               currentStep === 'select-flowers' ? 'Выберите цветы для регулярной доставки' :
               'Настройте параметры вашей подписки'}
            </p>
          </div>
          
          {currentStep === 'list' && (
            <Button 
              onClick={handleCreateSubscription}
              className="bg-pink-600 hover:bg-pink-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Новая подписка
            </Button>
          )}
          
          {currentStep !== 'list' && (
            <Button 
              variant="outline"
              onClick={() => {
                setCurrentStep('list')
                resetForm()
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Отмена
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      {currentStep === 'list' && (
        <>
          {subscriptionsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Загрузка подписок...</p>
            </div>
          ) : subscriptions.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Пока нет подписок</h3>
              <p className="text-gray-600 mb-6">
                Создайте подписку на регулярную доставку свежих цветов прямо к вашей двери
              </p>
              <Button 
                onClick={handleCreateSubscription}
                className="bg-pink-600 hover:bg-pink-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать первую подписку
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {subscriptions.map(subscription => renderSubscriptionCard(subscription))}
            </div>
          )}
        </>
      )}

      {/* Flower Selection Step */}
      {currentStep === 'select-flowers' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Выберите цветы для подписки
              </h3>
              <p className="text-gray-600">
                Выберите один или несколько видов цветов, которые будут доставляться регулярно
              </p>
            </div>

            {selectedFlowers.length > 0 && (
              <div className="mb-6 p-4 bg-pink-50 rounded-lg">
                <h4 className="font-medium text-pink-800 mb-2">
                  Выбрано цветов: {selectedFlowers.length}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedFlowers.map(flower => (
                    <Badge key={flower.id} className="bg-pink-100 text-pink-800">
                      {flower.name} - {flower.price}₽
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flowers?.map((flower: Flower) => {
                const isSelected = selectedFlowers.find(f => f.id === flower.id)
                return (
                  <div
                    key={flower.id}
                    onClick={() => handleFlowerSelection(flower)}
                    className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                      isSelected 
                        ? 'border-pink-500 bg-pink-50' 
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <img
                          src={flower.image_url || '/placeholder-flower.jpg'}
                          alt={flower.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{flower.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">{flower.category}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-bold text-pink-600">{flower.price} ₽</span>
                          {isSelected && (
                            <Check className="w-5 h-5 text-pink-600" />
                          )}
                        </div>
                      </div>
                    </div>
                    {!flower.is_available && (
                      <div className="mt-2 text-xs text-red-600">Временно недоступен</div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('list')}
              >
                Назад
              </Button>
              <Button
                onClick={handleContinueToConfig}
                disabled={selectedFlowers.length === 0}
                className="bg-pink-600 hover:bg-pink-700"
              >
                Продолжить ({selectedFlowers.length} выбрано)
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Configuration Step */}
      {currentStep === 'configure' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Настройки подписки
              </h3>
              <p className="text-gray-600">
                Настройте параметры доставки и частоту получения цветов
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Configuration Form */}
              <div className="space-y-6">
                <Input
                  label="Название подписки"
                  value={subscriptionForm.name}
                  onChange={(e) => setSubscriptionForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Мои любимые цветы"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Описание (необязательно)
                  </label>
                  <textarea
                    value={subscriptionForm.description}
                    onChange={(e) => setSubscriptionForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Подписка на еженедельную доставку роз..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Частота доставки"
                    value={subscriptionForm.frequency}
                    onChange={(value) => setSubscriptionForm(prev => ({ ...prev, frequency: value as any }))}
                    options={[
                      { value: 'daily', label: 'Ежедневно' },
                      { value: 'weekly', label: 'Еженедельно' },
                      { value: 'monthly', label: 'Ежемесячно' },
                    ]}
                  />

                  <Input
                    label="Количество за доставку"
                    type="number"
                    min="1"
                    max="10"
                    value={subscriptionForm.quantity_per_delivery}
                    onChange={(e) => setSubscriptionForm(prev => ({ 
                      ...prev, 
                      quantity_per_delivery: parseInt(e.target.value) || 1 
                    }))}
                  />
                </div>

                <Input
                  label="Адрес доставки"
                  value={subscriptionForm.delivery_address}
                  onChange={(e) => setSubscriptionForm(prev => ({ ...prev, delivery_address: e.target.value }))}
                  placeholder="Москва, ул. Пушкина, д. 1"
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Время доставки"
                    value={subscriptionForm.delivery_slot}
                    onChange={(value) => setSubscriptionForm(prev => ({ ...prev, delivery_slot: value as any }))}
                    options={[
                      { value: 'morning', label: '🌅 Утром (9:00-12:00)' },
                      { value: 'afternoon', label: '☀️ Днем (12:00-17:00)' },
                      { value: 'evening', label: '🌇 Вечером (17:00-21:00)' },
                    ]}
                  />

                  <Input
                    label="Дата начала"
                    type="date"
                    value={subscriptionForm.start_date}
                    onChange={(e) => setSubscriptionForm(prev => ({ ...prev, start_date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Инструкции для курьера (необязательно)
                  </label>
                  <textarea
                    value={subscriptionForm.delivery_instructions || ''}
                    onChange={(e) => setSubscriptionForm(prev => ({ ...prev, delivery_instructions: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    placeholder="Позвонить за 30 минут до доставки..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="auto_renew"
                    checked={subscriptionForm.auto_renew}
                    onChange={(e) => setSubscriptionForm(prev => ({ ...prev, auto_renew: e.target.checked }))}
                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                  />
                  <label htmlFor="auto_renew" className="text-sm font-medium text-gray-700">
                    Автоматическое продление подписки
                  </label>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Сводка подписки</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Цветы:</span>
                      <span className="font-medium">{selectedFlowers.length} вид(ов)</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Частота:</span>
                      <span className="font-medium">{getFrequencyLabel(subscriptionForm.frequency)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Количество:</span>
                      <span className="font-medium">{subscriptionForm.quantity_per_delivery} шт. за доставку</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Время:</span>
                      <span className="font-medium">
                        {subscriptionForm.delivery_slot === 'morning' ? 'Утром' :
                         subscriptionForm.delivery_slot === 'afternoon' ? 'Днем' : 'Вечером'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between pt-3 border-t border-gray-200">
                      <span className="text-gray-600">Стоимость за доставку:</span>
                      <span className="font-bold text-lg">
                        ~{Math.round(selectedFlowers.reduce((sum, f) => sum + f.price, 0) / selectedFlowers.length * subscriptionForm.quantity_per_delivery)} ₽
                      </span>
                    </div>
                  </div>
                </div>

                {/* Selected Flowers */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h5 className="font-medium text-green-800 mb-3">Выбранные цветы</h5>
                  <div className="space-y-2">
                    {selectedFlowers.map(flower => (
                      <div key={flower.id} className="flex items-center space-x-2">
                        <img
                          src={flower.image_url || '/placeholder-flower.jpg'}
                          alt={flower.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-green-800">{flower.name}</div>
                          <div className="text-xs text-green-600">{flower.price} ₽</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('select-flowers')}
              >
                Назад
              </Button>
              <Button
                onClick={handleSubmitSubscription}
                disabled={createSubscriptionMutation.isPending}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {createSubscriptionMutation.isPending ? 'Создание...' : 'Создать подписку'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Telegram Auth Modal */}
      {showAuthModal && (
        <Modal
          open={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          title="Авторизация через Telegram"
        >
          <div className="text-center py-8">
            <p className="text-gray-600 mb-6">
              Для создания подписки необходимо авторизоваться через Telegram. 
              Это обеспечит синхронизацию между сайтом и Mini App.
            </p>
            <TelegramLoginWidget
              botName="Flower_Moscow_appbot"
              buttonSize="large"
              cornerRadius={8}
              onAuth={handleTelegramAuth}
            />
          </div>
        </Modal>
      )}
    </div>
  )
} 