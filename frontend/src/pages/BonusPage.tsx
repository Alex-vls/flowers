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
  Breadcrumbs
} from '@/components/ui'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { TabsContent } from '@/components/ui/Tabs'
import api from '@/lib/api'
import MetricsService from '@/services/metrics'
import SEO from '@/components/SEO'
import { 
  Gift, 
  Star, 
  Users, 
  Award, 
  TrendingUp,
  Calendar,
  Share2,
  Copy,
  Crown,
  Zap,
  Heart,
  Trophy,
  Target,
  CheckCircle,
  Clock,
  Percent
} from 'lucide-react'

export default function BonusPage() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState('overview')
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [showPromoModal, setShowPromoModal] = useState(false)
  const [referralCode, setReferralCode] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [copiedReferral, setCopiedReferral] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  // Track page view
  useEffect(() => {
    MetricsService.trackPageView('bonus_page')
  }, [])

  // Fetch user bonuses
  const { data: bonuses, isLoading: bonusesLoading } = useQuery({
    queryKey: ['user-bonuses'],
    queryFn: async () => {
      const response = await api.get('/bonuses/my')
      return response.data || []
    },
    enabled: isAuthenticated,
  })

  // Fetch bonus stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['bonus-stats'],
    queryFn: async () => {
      const response = await api.get('/bonuses/stats')
      return response.data || {}
    },
    enabled: isAuthenticated,
  })

  // Use referral code mutation
  const useReferralMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post('/bonuses/use-referral', null, {
        params: { referral_code: code }
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bonuses'] })
      queryClient.invalidateQueries({ queryKey: ['bonus-stats'] })
      setShowReferralModal(false)
      setReferralCode('')
      MetricsService.trackEvent('referral_code_used')
    },
  })

  // Use promo code mutation
  const usePromoMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await api.post('/bonuses/use-promo', null, {
        params: { promo_code: code }
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-bonuses'] })
      queryClient.invalidateQueries({ queryKey: ['bonus-stats'] })
      setShowPromoModal(false)
      setPromoCode('')
      MetricsService.trackEvent('promo_code_used')
    },
  })

  const copyReferralCode = () => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code)
      setCopiedReferral(true)
      setTimeout(() => setCopiedReferral(false), 2000)
      MetricsService.trackEvent('referral_code_copied')
    }
  }

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Бонусы' },
  ]

  if (!isAuthenticated) {
    return null
  }

  const totalBonuses = user?.bonus_points || 0
  const loyaltyLevel = totalBonuses >= 1000 ? 'Платиновый' : 
                      totalBonuses >= 500 ? 'Золотой' : 
                      totalBonuses >= 200 ? 'Серебряный' : 'Бронзовый'

  return (
    <>
      <SEO 
        title="Бонусная программа - MSK Flower"
        description="Накапливайте бонусы, получайте скидки и участвуйте в программе лояльности MSK Flower"
        keywords={["бонусы", "скидки", "программа лояльности", "MSK Flower"]}
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} className="mb-6" />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Бонусная программа</h1>
          <p className="text-gray-600">
            Накапливайте бонусы за покупки и получайте скидки на будущие заказы
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Бонусы</p>
                <p className="text-2xl font-bold text-gray-900">{totalBonuses}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <Crown className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Уровень</p>
                <p className="text-lg font-bold text-gray-900">{loyaltyLevel}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Рефералы</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.referral_count || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Экономия</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_saved || 0}₽</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
            <TabsTrigger value="referral">Рефералы</TabsTrigger>
            <TabsTrigger value="promotions">Акции</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Loyalty Progress */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Программа лояльности</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Текущий уровень: {loyaltyLevel}</span>
                  <Badge variant="outline">{totalBonuses} бонусов</Badge>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                    style={{ width: `${Math.min((totalBonuses / 1000) * 100, 100)}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Бронзовый (0)</span>
                  <span>Серебряный (200)</span>
                  <span>Золотой (500)</span>
                  <span>Платиновый (1000)</span>
                </div>
              </div>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center mb-4">
                  <Share2 className="h-5 w-5 text-blue-500 mr-2" />
                  <h3 className="text-lg font-semibold">Пригласить друга</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Получите 100 бонусов за каждого приглашенного друга
                </p>
                <Button onClick={() => setShowReferralModal(true)} className="w-full">
                  Пригласить
                </Button>
              </Card>

              <Card className="p-6">
                <div className="flex items-center mb-4">
                  <Percent className="h-5 w-5 text-green-500 mr-2" />
                  <h3 className="text-lg font-semibold">Промокод</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Введите промокод и получите дополнительные бонусы
                </p>
                <Button onClick={() => setShowPromoModal(true)} variant="outline" className="w-full">
                  Ввести код
                </Button>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">История бонусов</h3>
              {bonusesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                </div>
              ) : bonuses?.length > 0 ? (
                <div className="space-y-4">
                  {bonuses.map((bonus: any) => (
                    <div key={bonus.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full ${
                          bonus.type === 'EARNED' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {bonus.type === 'EARNED' ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="font-medium">{bonus.description}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(bonus.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={`font-bold ${
                        bonus.type === 'EARNED' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {bonus.type === 'EARNED' ? '+' : '-'}{bonus.amount}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">История бонусов пуста</p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="referral" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Реферальная программа</h3>
              
              {user?.referral_code && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ваш реферальный код
                  </label>
                  <div className="flex">
                    <Input 
                      value={user.referral_code} 
                      readOnly 
                      className="flex-1"
                    />
                    <Button 
                      onClick={copyReferralCode}
                      variant="outline"
                      className="ml-2"
                    >
                      <Copy className="h-4 w-4" />
                      {copiedReferral ? 'Скопировано!' : 'Копировать'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Как это работает?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Поделитесь своим кодом с друзьями</li>
                  <li>• Друг получает 50 бонусов при регистрации</li>
                  <li>• Вы получаете 100 бонусов за каждого друга</li>
                  <li>• Бонусы начисляются после первого заказа друга</li>
                </ul>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="promotions" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Текущие акции</h3>
              
              <div className="space-y-4">
                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <div className="flex items-center mb-2">
                    <Gift className="h-5 w-5 text-purple-600 mr-2" />
                    <h4 className="font-semibold text-purple-900">Добро пожаловать!</h4>
                  </div>
                  <p className="text-purple-800 text-sm mb-2">
                    Получите 50 бонусов за первый заказ от 1000₽
                  </p>
                  <Badge variant="outline" className="text-purple-600 border-purple-600">
                    Для новых клиентов
                  </Badge>
                </div>

                <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center mb-2">
                    <Heart className="h-5 w-5 text-green-600 mr-2" />
                    <h4 className="font-semibold text-green-900">Подписка на цветы</h4>
                  </div>
                  <p className="text-green-800 text-sm mb-2">
                    Двойные бонусы за заказы по подписке
                  </p>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Постоянная акция
                  </Badge>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Referral Modal */}
        <Modal
          open={showReferralModal}
          onClose={() => setShowReferralModal(false)}
          title="Использовать реферальный код"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Введите реферальный код друга, чтобы получить бонусы
            </p>
            <Input
              placeholder="Введите код"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
            />
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowReferralModal(false)}
              >
                Отмена
              </Button>
              <Button
                onClick={() => useReferralMutation.mutate(referralCode)}
                disabled={!referralCode || useReferralMutation.isPending}
              >
                {useReferralMutation.isPending ? 'Применяем...' : 'Применить'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Promo Modal */}
        <Modal
          open={showPromoModal}
          onClose={() => setShowPromoModal(false)}
          title="Ввести промокод"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              Введите промокод для получения бонусов или скидки
            </p>
            <Input
              placeholder="Введите промокод"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
            />
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowPromoModal(false)}
              >
                Отмена
              </Button>
              <Button
                onClick={() => usePromoMutation.mutate(promoCode)}
                disabled={!promoCode || usePromoMutation.isPending}
              >
                {usePromoMutation.isPending ? 'Применяем...' : 'Применить'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  )
} 