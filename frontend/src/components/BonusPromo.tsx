import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Card, Button } from '@/components/ui'
import { 
  Gift, 
  Star, 
  Trophy, 
  Crown, 
  Sparkles,
  ArrowRight,
  Users,
  Target
} from 'lucide-react'

interface BonusPromoProps {
  compact?: boolean
  showOnlyForGuests?: boolean
}

export default function BonusPromo({ compact = false, showOnlyForGuests = false }: BonusPromoProps) {
  const { user, isAuthenticated } = useAuth()

  // Show only for guests if specified
  if (showOnlyForGuests && isAuthenticated) {
    return null
  }

  // Compact version
  if (compact) {
    return (
      <Card className="p-4 bg-gradient-to-r from-pink-50 to-yellow-50 border-pink-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-yellow-500 rounded-full flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">
                {isAuthenticated ? `${user?.bonus_points || 0} баллов` : 'Программа лояльности'}
              </div>
              <div className="text-sm text-gray-600">
                {isAuthenticated ? '1 балл = 1 ₽ скидки' : 'Зарабатывайте бонусы за покупки'}
              </div>
            </div>
          </div>
          <Link to="/bonuses">
            <Button size="sm" className="bg-pink-600 hover:bg-pink-700">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  // Full version
  return (
    <Card className="p-6 bg-gradient-to-br from-pink-50 via-rose-50 to-yellow-50 border-2 border-pink-200 shadow-lg">
      <div className="text-center mb-6">
        <div className="flex justify-center items-center space-x-2 mb-3">
          <Sparkles className="w-8 h-8 text-pink-500" />
          <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-yellow-600 bg-clip-text text-transparent">
            Программа лояльности
          </h3>
          <Sparkles className="w-8 h-8 text-yellow-500" />
        </div>
        <p className="text-gray-700">
          Зарабатывайте баллы за каждую покупку и получайте эксклюзивные преимущества!
        </p>
      </div>

      {/* Loyalty Levels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { name: 'Новичок', points: '0+', icon: <Star className="w-4 h-4" />, color: 'bg-gray-100 text-gray-700' },
          { name: 'Постоянный', points: '500+', icon: <Target className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
          { name: 'VIP', points: '1500+', icon: <Crown className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700' },
          { name: 'Платиновый', points: '5000+', icon: <Trophy className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-700' },
        ].map((level, index) => (
          <div key={index} className={`text-center p-3 rounded-lg ${level.color}`}>
            <div className="flex justify-center mb-1">{level.icon}</div>
            <div className="font-semibold text-xs">{level.name}</div>
            <div className="text-xs opacity-75">{level.points}</div>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Gift className="w-6 h-6 text-green-600" />
          </div>
          <div className="font-semibold text-sm">5% с каждой покупки</div>
          <div className="text-xs text-gray-600">Бонусами на счет</div>
        </div>
        
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div className="font-semibold text-sm">100 баллов за друга</div>
          <div className="text-xs text-gray-600">Реферальная программа</div>
        </div>
        
        <div className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <Crown className="w-6 h-6 text-purple-600" />
          </div>
          <div className="font-semibold text-sm">До 15% скидка</div>
          <div className="text-xs text-gray-600">На все заказы</div>
        </div>
      </div>

      {/* Current Status for Authenticated Users */}
      {isAuthenticated && (
        <div className="bg-white/60 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Ваши бонусы</div>
              <div className="text-2xl font-bold text-pink-600">{user?.bonus_points || 0}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Уровень</div>
              <div className="font-semibold text-gray-900">
                {(user?.bonus_points || 0) >= 5000 ? 'Платиновый' : 
                 (user?.bonus_points || 0) >= 1500 ? 'VIP' :
                 (user?.bonus_points || 0) >= 500 ? 'Постоянный' : 'Новичок'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="text-center">
        {isAuthenticated ? (
          <Link to="/bonuses">
            <Button className="bg-gradient-to-r from-pink-600 to-yellow-600 hover:from-pink-700 hover:to-yellow-700 text-white px-8 py-3">
              <Sparkles className="w-4 h-4 mr-2" />
              Управление бонусами
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        ) : (
          <div className="space-y-3">
            <Link to="/register">
              <Button className="bg-gradient-to-r from-pink-600 to-yellow-600 hover:from-pink-700 hover:to-yellow-700 text-white px-8 py-3 w-full">
                <Star className="w-4 h-4 mr-2" />
                Присоединиться к программе
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <p className="text-xs text-gray-600">
              Регистрация бесплатна • Приветственный бонус 50 баллов
            </p>
          </div>
        )}
      </div>
    </Card>
  )
} 