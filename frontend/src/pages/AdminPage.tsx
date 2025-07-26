import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import Tabs from '@/components/ui/Tabs'
import Modal from '@/components/ui/Modal'
import Alert from '@/components/ui/Alert'
import type { User, Flower, Order, Subscription, Review } from '@/types'

interface AdminStats {
  users: number
  flowers: number  
  orders: number
  subscriptions: number
  revenue: number
}

export default function AdminPage() {
  const { user, token, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [flowers, setFlowers] = useState<Flower[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingFlower, setEditingFlower] = useState<Flower | null>(null)

  // Проверка доступа
  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      navigate('/login')
      return
    }
  }, [isAuthenticated, user, navigate])

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

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [usersData, flowersData, ordersData, subscriptionsData] = await Promise.all([
        apiCall('/api/v1/users/users'),
        apiCall('/api/v1/flowers/'),
        apiCall('/api/v1/orders/admin/all'),
        apiCall('/api/v1/subscriptions/admin/all'),
      ])

      setUsers(usersData)
      setFlowers(flowersData)
      setOrders(ordersData)
      setSubscriptions(subscriptionsData)

      // Подсчет статистики
      const revenue = ordersData
        .filter((order: Order) => order.payment_status === 'paid')
        .reduce((sum: number, order: Order) => sum + order.total, 0)

      setStats({
        users: usersData.length,
        flowers: flowersData.length,
        orders: ordersData.length,
        subscriptions: subscriptionsData.length,
        revenue,
      })
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const updateUserStatus = async (userId: number, isActive: boolean) => {
    try {
      await apiCall(`/api/v1/users/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: isActive }),
      })
      await loadData()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const updateFlower = async (flower: Partial<Flower>) => {
    try {
      if (editingFlower?.id) {
        await apiCall(`/api/v1/flowers/${editingFlower.id}`, {
          method: 'PUT',
          body: JSON.stringify(flower),
        })
        await loadData()
        setEditingFlower(null)
      }
    } catch (error: any) {
      setError(error.message)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'courier': return 'bg-blue-100 text-blue-800'
      case 'client': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'delivered':
      case 'active':
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🎸 Админ-панель FlowerPunk</h1>
        <p className="text-gray-600">Управление цветочным хаосом</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      <Tabs
        tabs={[
          { id: 'dashboard', label: '📊 Дашборд' },
          { id: 'users', label: '👥 Пользователи' },
          { id: 'flowers', label: '🌸 Цветы' },
          { id: 'orders', label: '📦 Заказы' },
          { id: 'subscriptions', label: '🔄 Подписки' },
          { id: 'reviews', label: '📝 Отзывы' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="mt-6">
        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card className="p-6">
              <div className="text-2xl font-bold text-blue-600">{stats?.users || 0}</div>
              <div className="text-sm text-gray-600">Пользователей</div>
            </Card>
            <Card className="p-6">
              <div className="text-2xl font-bold text-green-600">{stats?.flowers || 0}</div>
              <div className="text-sm text-gray-600">Цветов</div>
            </Card>
            <Card className="p-6">
              <div className="text-2xl font-bold text-yellow-600">{stats?.orders || 0}</div>
              <div className="text-sm text-gray-600">Заказов</div>
            </Card>
            <Card className="p-6">
              <div className="text-2xl font-bold text-purple-600">{stats?.subscriptions || 0}</div>
              <div className="text-sm text-gray-600">Подписок</div>
            </Card>
            <Card className="p-6">
              <div className="text-2xl font-bold text-pink-600">{(stats?.revenue || 0).toLocaleString()} ₽</div>
              <div className="text-sm text-gray-600">Выручка</div>
            </Card>
          </div>
        )}

        {/* Users */}
        {activeTab === 'users' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Пользователи</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Имя</th>
                    <th className="text-left py-2">Email</th>
                    <th className="text-left py-2">Роль</th>
                    <th className="text-left py-2">Бонусы</th>
                    <th className="text-left py-2">Статус</th>
                    <th className="text-left py-2">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b">
                      <td className="py-2">{user.id}</td>
                      <td className="py-2">{user.full_name}</td>
                      <td className="py-2">{user.email}</td>
                      <td className="py-2">
                        <Badge className={getRoleColor(user.role)}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-2">{user.bonus_points}</td>
                      <td className="py-2">
                        <Badge className={user.is_verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {user.is_verified ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <Button
                          size="sm"
                          variant={user.is_verified ? 'destructive' : 'default'}
                          onClick={() => updateUserStatus(user.id, !user.is_verified)}
                        >
                          {user.is_verified ? 'Заблокировать' : 'Разблокировать'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Flowers */}
        {activeTab === 'flowers' && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Цветы</h3>
              <Button onClick={() => setEditingFlower({} as Flower)}>
                Добавить цветок
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flowers.map((flower) => (
                <Card key={flower.id} className="p-4">
                  {flower.image_url && (
                    <img 
                      src={flower.image_url} 
                      alt={flower.name}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                  )}
                  <h4 className="font-semibold">{flower.name}</h4>
                  <p className="text-sm text-gray-600 mb-2">{flower.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-green-600">{flower.price} ₽</span>
                    <Badge className={flower.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {flower.is_available ? 'В наличии' : 'Нет в наличии'}
                    </Badge>
                  </div>
                  <Button 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={() => setEditingFlower(flower)}
                  >
                    Редактировать
                  </Button>
                </Card>
              ))}
            </div>
          </Card>
        )}

        {/* Orders */}
        {activeTab === 'orders' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Заказы</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">№ заказа</th>
                    <th className="text-left py-2">Пользователь</th>
                    <th className="text-left py-2">Сумма</th>
                    <th className="text-left py-2">Статус</th>
                    <th className="text-left py-2">Оплата</th>
                    <th className="text-left py-2">Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-2">{order.order_number}</td>
                      <td className="py-2">{order.user_id}</td>
                      <td className="py-2">{order.total} ₽</td>
                      <td className="py-2">
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <Badge className={getStatusColor(order.payment_status)}>
                          {order.payment_status}
                        </Badge>
                      </td>
                      <td className="py-2">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Subscriptions */}
        {activeTab === 'subscriptions' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Подписки</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Пользователь</th>
                    <th className="text-left py-2">Название</th>
                    <th className="text-left py-2">Частота</th>
                    <th className="text-left py-2">Цена</th>
                    <th className="text-left py-2">Статус</th>
                    <th className="text-left py-2">Следующая доставка</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id} className="border-b">
                      <td className="py-2">{subscription.id}</td>
                      <td className="py-2">{subscription.user_id}</td>
                      <td className="py-2">{subscription.name}</td>
                      <td className="py-2">{subscription.frequency}</td>
                      <td className="py-2">{subscription.total_price} ₽</td>
                      <td className="py-2">
                        <Badge className={getStatusColor(subscription.status)}>
                          {subscription.status}
                        </Badge>
                      </td>
                      <td className="py-2">
                        {new Date(subscription.next_delivery_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Reviews */}
        {activeTab === 'reviews' && (
          <ReviewModerationPanel />
        )}
      </div>

      {/* Flower Edit Modal */}
      {editingFlower && (
        <Modal
          isOpen={true}
          onClose={() => setEditingFlower(null)}
          title={editingFlower.id ? 'Редактировать цветок' : 'Добавить цветок'}
        >
          <FlowerEditForm
            flower={editingFlower}
            onSave={updateFlower}
            onCancel={() => setEditingFlower(null)}
          />
        </Modal>
      )}
    </div>
  )
}

interface FlowerEditFormProps {
  flower: Flower
  onSave: (flower: Partial<Flower>) => void
  onCancel: () => void
}

function FlowerEditForm({ flower, onSave, onCancel }: FlowerEditFormProps) {
  const [formData, setFormData] = useState({
    name: flower.name || '',
    description: flower.description || '',
    category: flower.category || 'ROSES',
    price: flower.price || 0,
    image_url: flower.image_url || '',
    is_available: flower.is_available ?? true,
    min_order_quantity: flower.min_order_quantity || 1,
    max_order_quantity: flower.max_order_quantity || 10,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Название"
        value={formData.name}
        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        required
      />
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Описание
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          rows={3}
          required
        />
      </div>

      <Select
        label="Категория"
        value={formData.category}
        onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
        options={[
          { value: 'ROSES', label: 'Розы' },
          { value: 'TULIPS', label: 'Тюльпаны' },
          { value: 'LILIES', label: 'Лилии' },
          { value: 'ORCHIDS', label: 'Орхидеи' },
          { value: 'SUNFLOWERS', label: 'Подсолнухи' },
          { value: 'DAISIES', label: 'Ромашки' },
          { value: 'CARNATIONS', label: 'Гвоздики' },
        ]}
      />

      <Input
        label="Цена (₽)"
        type="number"
        value={formData.price}
        onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
        required
      />

      <Input
        label="URL изображения"
        value={formData.image_url}
        onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
      />

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="is_available"
          checked={formData.is_available}
          onChange={(e) => setFormData(prev => ({ ...prev, is_available: e.target.checked }))}
        />
        <label htmlFor="is_available" className="text-sm font-medium text-gray-700">
          В наличии
        </label>
      </div>

      <div className="flex space-x-4 pt-4">
        <Button type="submit" className="flex-1">
          {flower.id ? 'Сохранить' : 'Создать'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Отмена
        </Button>
      </div>
    </form>
  )
}

// Review Moderation Panel Component
function ReviewModerationPanel() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTab, setSelectedTab] = useState<'pending' | 'all' | 'stats'>('pending')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectingReviewId, setRejectingReviewId] = useState<number | null>(null)

  const loadPendingReviews = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/reviews/admin/pending', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (!response.ok) throw new Error('Ошибка загрузки отзывов')
      const data = await response.json()
      setReviews(data)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadAllReviews = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/reviews?is_approved=', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (!response.ok) throw new Error('Ошибка загрузки отзывов')
      const data = await response.json()
      setReviews(data)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/v1/reviews/admin/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (!response.ok) throw new Error('Ошибка загрузки статистики')
      const data = await response.json()
      setStats(data)
    } catch (error: any) {
      setError(error.message)
    }
  }

  const approveReview = async (reviewId: number) => {
    try {
      const response = await fetch(`/api/v1/reviews/admin/${reviewId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (!response.ok) throw new Error('Ошибка одобрения отзыва')
      await loadPendingReviews()
    } catch (error: any) {
      setError(error.message)
    }
  }

  const rejectReview = async (reviewId: number, reason: string) => {
    try {
      const response = await fetch(`/api/v1/reviews/admin/${reviewId}/reject?reason=${encodeURIComponent(reason)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      if (!response.ok) throw new Error('Ошибка отклонения отзыва')
      await loadPendingReviews()
      setRejectingReviewId(null)
      setRejectReason('')
    } catch (error: any) {
      setError(error.message)
    }
  }

  useEffect(() => {
    if (selectedTab === 'pending') {
      loadPendingReviews()
    } else if (selectedTab === 'all') {
      loadAllReviews()
    } else if (selectedTab === 'stats') {
      loadStats()
    }
  }, [selectedTab])

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
    ))
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Модерация отзывов</h3>
        
        {error && (
          <Alert type="error" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b">
          <button
            className={`pb-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'pending' 
                ? 'border-pink-500 text-pink-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setSelectedTab('pending')}
          >
            🕐 На модерации ({reviews.filter(r => !r.is_approved && !r.is_flagged).length})
          </button>
          <button
            className={`pb-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'all' 
                ? 'border-pink-500 text-pink-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setSelectedTab('all')}
          >
            📝 Все отзывы
          </button>
          <button
            className={`pb-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'stats' 
                ? 'border-pink-500 text-pink-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setSelectedTab('stats')}
          >
            📊 Статистика
          </button>
        </div>

        {loading && <div className="text-center py-8">Загрузка...</div>}

        {/* Reviews List */}
        {(selectedTab === 'pending' || selectedTab === 'all') && !loading && (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Отзывов не найдено
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">
                          Пользователь #{review.user_id}
                        </span>
                        <div className="flex">
                          {renderStars(review.rating)}
                        </div>
                        <Badge className={
                          review.is_approved 
                            ? 'bg-green-100 text-green-800'
                            : review.is_flagged 
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }>
                          {review.is_approved 
                            ? 'Одобрен' 
                            : review.is_flagged 
                            ? 'Отклонен' 
                            : 'На модерации'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        Товар #{review.flower_id} • Заказ #{review.order_id}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {review.title && (
                    <h4 className="font-medium mb-2">{review.title}</h4>
                  )}
                  
                  <p className="text-gray-800 mb-3">{review.content}</p>

                  {review.flagged_reason && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
                      <span className="text-red-800 text-sm">
                        <strong>Причина отклонения:</strong> {review.flagged_reason}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      👍 {review.helpful_votes} из {review.total_votes} считают полезным
                    </div>
                    
                    {!review.is_approved && !review.is_flagged && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => approveReview(review.id)}
                        >
                          ✅ Одобрить
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-600 hover:bg-red-50"
                          onClick={() => setRejectingReviewId(review.id)}
                        >
                          ❌ Отклонить
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Reject Modal */}
                  {rejectingReviewId === review.id && (
                    <div className="mt-4 p-4 bg-white border rounded">
                      <h5 className="font-medium mb-2">Причина отклонения:</h5>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full border rounded px-3 py-2 mb-3"
                        rows={3}
                        placeholder="Укажите причину отклонения отзыва..."
                      />
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => rejectReview(review.id, rejectReason)}
                          disabled={!rejectReason.trim()}
                        >
                          Отклонить
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectingReviewId(null)
                            setRejectReason('')
                          }}
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Stats */}
        {selectedTab === 'stats' && stats && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-4">
              <h4 className="font-semibold mb-2">Средний рейтинг</h4>
              <div className="text-3xl font-bold text-yellow-600">
                {stats.average_rating.toFixed(1)}
              </div>
              <div className="flex mt-1">
                {renderStars(Math.round(stats.average_rating))}
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold mb-3">Статус модерации</h4>
              <div className="space-y-2">
                {stats.approval_stats.map((stat: any) => (
                  <div key={stat.is_approved.toString()} className="flex justify-between">
                    <span className="text-sm">
                      {stat.is_approved ? 'Одобрены' : 'На модерации'}
                    </span>
                    <span className="font-medium">{stat.count}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-semibold mb-3">Распределение оценок</h4>
              <div className="space-y-2">
                {stats.rating_distribution.map((stat: any) => (
                  <div key={stat.rating} className="flex justify-between items-center">
                    <div className="flex items-center space-x-1">
                      <span className="text-sm">{stat.rating}</span>
                      <span className="text-yellow-400">★</span>
                    </div>
                    <span className="font-medium">{stat.count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </Card>
    </div>
  )
}