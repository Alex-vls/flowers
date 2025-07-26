import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Alert from '@/components/ui/Alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import SEO from '@/components/SEO'
import { 
  User, 
  Gift, 
  Star, 
  Settings, 
  Package, 
  Calendar,
  CreditCard,
  MessageSquare,
  Edit,
  Trash2,
  Eye
} from 'lucide-react'

interface UserProfile {
  id: number
  email: string
  full_name: string
  phone?: string
  address?: string
  bonus_points: number
  is_verified: boolean
  created_at: string
  role: string
}

interface UserBonus {
  id: number
  amount: number
  description: string
  created_at: string
  type: string
}

interface Order {
  id: number
  total_amount: number
  status: string
  created_at: string
  delivery_date: string
  delivery_address: string
  items: Array<{
    flower_name: string
    quantity: number
    price: number
  }>
}

interface Review {
  id: number
  flower_id: number
  flower_name: string
  rating: number
  comment: string
  created_at: string
  photos?: string[]
}

export default function ProfilePage() {
  const { user, token, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [bonuses, setBonuses] = useState<UserBonus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    address: ''
  })

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['user-orders'],
    queryFn: async () => {
      const response = await apiClient.getOrders()
      return response.data || []
    },
    enabled: isAuthenticated,
  })

  // Fetch reviews
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['user-reviews'],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User ID is required')
      }
      const response = await apiClient.getReviews({ user_id: user.id })
      return response.data || []
    },
    enabled: isAuthenticated && !!user?.id,
  })

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    loadProfile()
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

  const loadProfile = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [profileData, bonusesData] = await Promise.all([
        apiCall('/api/v1/users/me'),
        apiCall('/api/v1/bonuses/').catch(() => [])
      ])

      setProfile(profileData)
      setBonuses(Array.isArray(bonusesData) ? bonusesData : [])
      
      setEditForm({
        full_name: profileData.full_name || '',
        phone: profileData.phone || '',
        address: profileData.address || ''
      })
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const updatedProfile = await apiCall('/api/v1/users/me', {
        method: 'PUT',
        body: JSON.stringify(editForm)
      })
      
      setProfile(updatedProfile)
      setEditing(false)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'delivering': return 'bg-blue-100 text-blue-800'
      case 'confirmed': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered': return 'Доставлен'
      case 'delivering': return 'В пути'
      case 'confirmed': return 'Подтвержден'
      case 'cancelled': return 'Отменен'
      default: return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU')
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <>
      <SEO
        title="Мой профиль - MSK Flower"
        description="Управление профилем, заказами, подписками и бонусами"
      />
      
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🎸 Мой профиль</h1>
          <p className="text-gray-600">Управление аккаунтом, заказами и бонусами</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            {error}
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Package className="w-4 h-4 mr-2" />
              Заказы ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <Star className="w-4 h-4 mr-2" />
              Отзывы ({reviews.length})
            </TabsTrigger>
            <TabsTrigger value="bonuses">
              <Gift className="w-4 h-4 mr-2" />
              Бонусы
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main profile info */}
              <div className="lg:col-span-2">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Личная информация
                    </h2>
                    <Button
                      variant="outline"
                      onClick={() => setEditing(!editing)}
                      disabled={loading}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {editing ? 'Отмена' : 'Редактировать'}
                    </Button>
                  </div>

                  {editing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Полное имя
                        </label>
                        <Input
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                          placeholder="Введите полное имя"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Телефон
                        </label>
                        <Input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                          placeholder="+7 (XXX) XXX-XX-XX"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Адрес доставки
                        </label>
                        <Input
                          value={editForm.address}
                          onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                          placeholder="Введите адрес доставки"
                        />
                      </div>
                      <div className="flex space-x-3">
                        <Button onClick={handleSaveProfile} disabled={loading}>
                          Сохранить
                        </Button>
                        <Button variant="outline" onClick={() => setEditing(false)}>
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600">Email</label>
                          <p className="font-medium">{profile.email}</p>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600">Полное имя</label>
                          <p className="font-medium">{profile.full_name || '—'}</p>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600">Телефон</label>
                          <p className="font-medium">{profile.phone || '—'}</p>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600">Адрес</label>
                          <p className="font-medium">{profile.address || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Bonus points */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold flex items-center mb-4">
                    <Gift className="w-5 h-5 mr-2" />
                    Бонусные баллы
                  </h3>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-pink-600">
                      {profile.bonus_points || 0}
                    </div>
                    <div className="text-sm text-gray-600">баллов</div>
                  </div>
                </Card>

                {/* Account status */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold flex items-center mb-4">
                    <Star className="w-5 h-5 mr-2" />
                    Статус аккаунта
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Верификация:</span>
                      <Badge className={profile.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {profile.is_verified ? 'Подтвержден' : 'Не подтвержден'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Участник с:</span>
                      <span className="text-sm text-gray-600">
                        {formatDate(profile.created_at)}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold flex items-center mb-6">
                <Package className="w-5 h-5 mr-2" />
                История заказов
              </h2>

              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full"></div>
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order: Order) => (
                    <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold">Заказ №{order.id}</h3>
                            <Badge className={getStatusColor(order.status)}>
                              {getStatusLabel(order.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatDate(order.created_at)} • Доставка: {formatDate(order.delivery_date)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{order.total_amount}₽</p>
                          <p className="text-sm text-gray-600">{order.items?.length || 0} товар(ов)</p>
                        </div>
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.flower_name} × {item.quantity}</span>
                              <span>{item.price * item.quantity}₽</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-3 border-t">
                        <p className="text-sm text-gray-600">
                          📍 {order.delivery_address}
                        </p>
                        <div className="flex space-x-2">
                          <Link to={`/order/${order.id}`}>
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-1" />
                              Детали
                            </Button>
                          </Link>
                          {order.status === 'delivered' && (
                            <Button size="sm" variant="outline">
                              <Star className="w-4 h-4 mr-1" />
                              Отзыв
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Нет заказов
                  </h3>
                  <p className="text-gray-600 mb-4">
                    У вас пока нет заказов
                  </p>
                  <Link to="/catalog">
                    <Button>
                      Перейти в каталог
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold flex items-center mb-6">
                <MessageSquare className="w-5 h-5 mr-2" />
                Мои отзывы
              </h2>

              {reviewsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full"></div>
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review: Review) => (
                    <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold">{review.flower_name}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">
                              {formatDate(review.created_at)}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3">{review.comment}</p>

                      {review.photos && review.photos.length > 0 && (
                        <div className="flex space-x-2">
                          {review.photos.map((photo, index) => (
                            <img
                              key={index}
                              src={photo}
                              alt={`Фото отзыва ${index + 1}`}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Нет отзывов
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Вы еще не оставили ни одного отзыва
                  </p>
                  <Link to="/orders">
                    <Button>
                      Посмотреть заказы
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Bonuses Tab */}
          <TabsContent value="bonuses" className="space-y-6">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <Gift className="w-5 h-5 mr-2" />
                  История бонусов
                </h2>
                <Button 
                  onClick={() => navigate('/bonuses')}
                  className="bg-pink-600 hover:bg-pink-700"
                  size="sm"
                >
                  Управление бонусами
                </Button>
              </div>

              <div className="mb-6 text-center">
                <div className="text-4xl font-bold text-pink-600 mb-2">
                  {profile.bonus_points || 0}
                </div>
                <p className="text-gray-600">доступно баллов</p>
                <p className="text-sm text-gray-500 mt-2">
                  1 балл = 1 рубль при оплате
                </p>
              </div>

              {bonuses.length > 0 ? (
                <div className="space-y-3">
                  {bonuses.map((bonus) => (
                    <div key={bonus.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{bonus.description}</p>
                        <p className="text-sm text-gray-600">{formatDate(bonus.created_at)}</p>
                      </div>
                      <div className={`font-bold ${bonus.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {bonus.amount > 0 ? '+' : ''}{bonus.amount} баллов
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Gift className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Нет бонусных операций
                  </h3>
                  <p className="text-gray-600">
                    История начисления и списания баллов появится здесь
                  </p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
} 