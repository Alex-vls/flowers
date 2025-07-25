import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Alert from '@/components/ui/Alert'
import { User, Gift, Star, Settings } from 'lucide-react'

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
  points: number
  type: string
  status: string
  expires_at?: string
  created_at: string
}

export default function ProfilePage() {
  const { user, token, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [bonuses, setBonuses] = useState<UserBonus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    address: ''
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
        apiCall('/api/v1/bonuses/').catch(() => []) // Бонусы могут быть недоступны
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
        body: JSON.stringify(editForm),
      })
      
      setProfile(updatedProfile)
      setEditing(false)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getBonusTypeLabel = (type: string) => {
    switch (type) {
      case 'welcome': return 'Приветственный'
      case 'referral': return 'За реферала'
      case 'purchase': return 'За покупку'
      case 'gift': return 'Подарочный'
      case 'promotion': return 'Акция'
      default: return type
    }
  }

  const getBonusStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'used': return 'bg-gray-100 text-gray-800'
      case 'expired': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">🎸 Мой профиль</h1>
        <p className="text-gray-600">Управление аккаунтом и бонусами</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Основная информация */}
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

            {loading && !profile ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2 text-gray-600">Загрузка...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Полное имя"
                    value={editing ? editForm.full_name : profile?.full_name || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    disabled={!editing}
                  />
                  
                  <Input
                    label="Email"
                    value={profile?.email || ''}
                    disabled={true}
                    help="Email нельзя изменить"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Телефон"
                    value={editing ? editForm.phone : profile?.phone || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!editing}
                    placeholder="+7-999-123-45-67"
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Роль
                    </label>
                    <Badge className={profile?.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {profile?.role === 'admin' ? 'Администратор' : 'Клиент'}
                    </Badge>
                  </div>
                </div>

                <Input
                  label="Адрес доставки"
                  value={editing ? editForm.address : profile?.address || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                  disabled={!editing}
                  placeholder="Москва, ул. Панк-Рок, д. 1"
                />

                {editing && (
                  <div className="flex space-x-4 pt-4">
                    <Button 
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Сохранение...' : 'Сохранить'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditing(false)}
                      className="flex-1"
                    >
                      Отмена
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Статистика и бонусы */}
        <div className="space-y-6">
          {/* Бонусные баллы */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold flex items-center mb-4">
              <Gift className="w-5 h-5 mr-2" />
              Бонусные баллы
            </h3>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600">
                {profile?.bonus_points || 0}
              </div>
              <div className="text-sm text-gray-600">баллов</div>
            </div>
          </Card>

          {/* Статус аккаунта */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold flex items-center mb-4">
              <Star className="w-5 h-5 mr-2" />
              Статус
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Верификация:</span>
                <Badge className={profile?.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                  {profile?.is_verified ? 'Подтвержден' : 'Не подтвержден'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Участник с:</span>
                <span className="text-sm text-gray-600">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* История бонусов */}
      {bonuses.length > 0 && (
        <Card className="p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4">История бонусов</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Дата</th>
                  <th className="text-left py-2">Тип</th>
                  <th className="text-left py-2">Баллы</th>
                  <th className="text-left py-2">Статус</th>
                  <th className="text-left py-2">Истекает</th>
                </tr>
              </thead>
              <tbody>
                {bonuses.map((bonus) => (
                  <tr key={bonus.id} className="border-b">
                    <td className="py-2">
                      {new Date(bonus.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2">{getBonusTypeLabel(bonus.type)}</td>
                    <td className="py-2 font-semibold">+{bonus.points}</td>
                    <td className="py-2">
                      <Badge className={getBonusStatusColor(bonus.status)}>
                        {bonus.status === 'active' ? 'Активен' : 
                         bonus.status === 'used' ? 'Использован' : 'Истек'}
                      </Badge>
                    </td>
                    <td className="py-2 text-sm text-gray-600">
                      {bonus.expires_at ? new Date(bonus.expires_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
} 