import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Alert from '@/components/ui/Alert'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { Calendar, Clock, Pause, Play, Trash2, Plus } from 'lucide-react'

interface Subscription {
  id: number
  name: string
  description?: string
  frequency: string
  quantity: number
  price_per_delivery: number
  total_price: number
  status: string
  start_date: string
  end_date?: string
  next_delivery_date: string
  delivery_slot: string
  delivery_address: string
  auto_renewal: boolean
  created_at: string
}

interface SubscriptionForm {
  name: string
  description: string
  frequency: string
  quantity: number
  delivery_slot: string
  delivery_address: string
  auto_renewal: boolean
}

export default function SubscriptionPage() {
  const { user, token, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  
  const [subscriptionForm, setSubscriptionForm] = useState<SubscriptionForm>({
    name: '',
    description: '',
    frequency: 'weekly',
    quantity: 1,
    delivery_slot: 'morning',
    delivery_address: '',
    auto_renewal: true
  })

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    loadSubscriptions()
  }, [isAuthenticated, navigate])

  const apiCall = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'API Error')
    }

    return response.json()
  }

  const loadSubscriptions = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await apiCall('/api/v1/subscriptions/')
      setSubscriptions(Array.isArray(data) ? data : [])
    } catch (error: any) {
      setError(error.message)
      setSubscriptions([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubscription = async () => {
    setLoading(true)
    setError(null)
    
    try {
      await apiCall('/api/v1/subscriptions/', {
        method: 'POST',
        body: JSON.stringify(subscriptionForm),
      })
      
      setShowCreateModal(false)
      setSubscriptionForm({
        name: '',
        description: '',
        frequency: 'weekly',
        quantity: 1,
        delivery_slot: 'morning',
        delivery_address: '',
        auto_renewal: true
      })
      await loadSubscriptions()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePauseSubscription = async (id: number) => {
    try {
      await apiCall(`/api/v1/subscriptions/${id}/pause`, {
        method: 'POST',
      })
      await loadSubscriptions()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleResumeSubscription = async (id: number) => {
    try {
      await apiCall(`/api/v1/subscriptions/${id}/resume`, {
        method: 'POST',
      })
      await loadSubscriptions()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const handleCancelSubscription = async (id: number) => {
    if (!confirm('Вы уверены, что хотите отменить подписку?')) {
      return
    }
    
    try {
      await apiCall(`/api/v1/subscriptions/${id}`, {
        method: 'DELETE',
      })
      await loadSubscriptions()
    } catch (error: any) {
      setError(error.message)
    }
  }

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
    return null
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🔄 Мои подписки</h1>
            <p className="text-gray-600">Управление подписками на доставку цветов</p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-pink-600 hover:bg-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Новая подписка
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      {loading && subscriptions.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка подписок...</p>
        </div>
      ) : subscriptions.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Пока нет подписок</h3>
          <p className="text-gray-600 mb-6">
            Создайте подписку на регулярную доставку свежих цветов
          </p>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-pink-600 hover:bg-pink-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать первую подписку
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{subscription.name}</h3>
                  {subscription.description && (
                    <p className="text-sm text-gray-600 mt-1">{subscription.description}</p>
                  )}
                </div>
                <Badge className={getStatusColor(subscription.status)}>
                  {getStatusLabel(subscription.status)}
                </Badge>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Частота:</span>
                  <span className="text-sm font-medium">{getFrequencyLabel(subscription.frequency)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Количество:</span>
                  <span className="text-sm font-medium">{subscription.quantity} шт.</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Время доставки:</span>
                  <span className="text-sm font-medium">
                    {subscription.delivery_slot === 'morning' ? 'Утром' :
                     subscription.delivery_slot === 'afternoon' ? 'Днем' : 'Вечером'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Цена за доставку:</span>
                  <span className="text-sm font-medium">{subscription.price_per_delivery} ₽</span>
                </div>
                
                {subscription.next_delivery_date && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Следующая доставка:</span>
                    <span className="text-sm font-medium">
                      {new Date(subscription.next_delivery_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                
                <div className="pt-2 border-t">
                  <div className="text-xs text-gray-500">{subscription.delivery_address}</div>
                </div>
              </div>

              <div className="flex space-x-2">
                {subscription.status === 'active' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePauseSubscription(subscription.id)}
                    className="flex-1"
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    Пауза
                  </Button>
                ) : subscription.status === 'paused' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResumeSubscription(subscription.id)}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Возобновить
                  </Button>
                ) : null}
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleCancelSubscription(subscription.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Subscription Modal */}
      {showCreateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          title="Создать подписку"
        >
          <div className="space-y-4">
            <Input
              label="Название подписки"
              value={subscriptionForm.name}
              onChange={(e) => setSubscriptionForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ежедневные розы"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Описание
              </label>
              <textarea
                value={subscriptionForm.description}
                onChange={(e) => setSubscriptionForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Описание подписки..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Частота доставки"
                value={subscriptionForm.frequency}
                onChange={(value) => setSubscriptionForm(prev => ({ ...prev, frequency: value }))}
                options={[
                  { value: 'daily', label: 'Ежедневно' },
                  { value: 'weekly', label: 'Еженедельно' },
                  { value: 'monthly', label: 'Ежемесячно' },
                ]}
              />

              <Input
                label="Количество"
                type="number"
                min="1"
                value={subscriptionForm.quantity}
                onChange={(e) => setSubscriptionForm(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
              />
            </div>

            <Select
              label="Время доставки"
              value={subscriptionForm.delivery_slot}
              onChange={(value) => setSubscriptionForm(prev => ({ ...prev, delivery_slot: value }))}
              options={[
                { value: 'morning', label: 'Утром (9:00-12:00)' },
                { value: 'afternoon', label: 'Днем (12:00-18:00)' },
                { value: 'evening', label: 'Вечером (18:00-21:00)' },
              ]}
            />

            <Input
              label="Адрес доставки"
              value={subscriptionForm.delivery_address}
              onChange={(e) => setSubscriptionForm(prev => ({ ...prev, delivery_address: e.target.value }))}
              placeholder="Москва, ул. Панк-Рок, д. 1"
              required
            />

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto_renewal"
                checked={subscriptionForm.auto_renewal}
                onChange={(e) => setSubscriptionForm(prev => ({ ...prev, auto_renewal: e.target.checked }))}
              />
              <label htmlFor="auto_renewal" className="text-sm font-medium text-gray-700">
                Автоматическое продление
              </label>
            </div>

            <div className="flex space-x-4 pt-4">
              <Button 
                onClick={handleCreateSubscription}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Создание...' : 'Создать подписку'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
} 