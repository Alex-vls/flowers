import { useState } from 'react'
import { Calendar, MapPin, Clock, Pause, Play, X, Settings } from 'lucide-react'
import { Subscription } from '@/types'
import { formatPrice, formatDate } from '@/lib/utils'
import { SUBSCRIPTION_STATUSES, DELIVERY_SLOTS } from '@/constants'
import { Badge, Button, Card } from '@/components/ui'

interface SubscriptionCardProps {
  subscription: Subscription
  onPause?: (subscriptionId: number) => void
  onResume?: (subscriptionId: number) => void
  onCancel?: (subscriptionId: number) => void
  onEdit?: (subscriptionId: number) => void
}

export default function SubscriptionCard({ 
  subscription, 
  onPause, 
  onResume, 
  onCancel, 
  onEdit 
}: SubscriptionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const statusInfo = SUBSCRIPTION_STATUSES.find(s => s.id === subscription.status)
  const deliverySlotInfo = DELIVERY_SLOTS.find(s => s.id === subscription.delivery_slot)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="w-5 h-5 text-green-600" />
      case 'paused':
        return <Pause className="w-5 h-5 text-yellow-600" />
      case 'cancelled':
        return <X className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const getFrequencyText = (frequency: string) => {
    switch (frequency) {
      case 'daily':
        return 'Ежедневно'
      case 'weekly':
        return 'Еженедельно'
      case 'monthly':
        return 'Ежемесячно'
      case 'custom':
        return 'Произвольно'
      default:
        return frequency
    }
  }

  const canPause = subscription.status === 'active'
  const canResume = subscription.status === 'paused'
  const canCancel = subscription.status === 'active' || subscription.status === 'paused'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {subscription.name}
            </h3>
            {subscription.description && (
              <p className="text-sm text-gray-600 mb-2">
                {subscription.description}
              </p>
            )}
            <p className="text-sm text-gray-500">
              Создана {formatDate(subscription.created_at)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(subscription.status)}
            <Badge color={statusInfo?.color as any}>
              {statusInfo?.name}
            </Badge>
          </div>
        </div>

        {/* Subscription details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Частота: {getFrequencyText(subscription.frequency)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Clock className="w-4 h-4" />
            <span>Слот: {deliverySlotInfo?.name}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{subscription.delivery_address}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Settings className="w-4 h-4" />
            <span>Количество: {subscription.quantity}</span>
          </div>
        </div>

        {/* Next delivery */}
        <div className="mb-4 p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">
                Следующая доставка
              </p>
              <p className="text-sm text-green-600">
                {formatDate(subscription.next_delivery_date)} в {deliverySlotInfo?.time}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-800">
                {formatPrice(subscription.price_per_delivery)}
              </p>
              <p className="text-xs text-green-600">за доставку</p>
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mb-4 border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Детали подписки:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Дата начала:</p>
                <p className="font-medium">{formatDate(subscription.start_date)}</p>
              </div>
              {subscription.end_date && (
                <div>
                  <p className="text-gray-600">Дата окончания:</p>
                  <p className="font-medium">{formatDate(subscription.end_date)}</p>
                </div>
              )}
              <div>
                <p className="text-gray-600">Автопродление:</p>
                <p className="font-medium">
                  {subscription.auto_renewal ? 'Включено' : 'Отключено'}
                </p>
              </div>
              {subscription.custom_days && subscription.custom_days.length > 0 && (
                <div>
                  <p className="text-gray-600">Дни доставки:</p>
                  <p className="font-medium">
                    {subscription.custom_days.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pricing and actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="text-lg font-bold text-gray-900">
              {formatPrice(subscription.total_price)}
            </p>
            <p className="text-sm text-gray-500">
              Общая стоимость подписки
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Скрыть детали' : 'Показать детали'}
            </Button>

            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(subscription.id)}
              >
                <Settings className="w-4 h-4 mr-1" />
                Изменить
              </Button>
            )}

            {canPause && onPause && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPause(subscription.id)}
                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
              >
                <Pause className="w-4 h-4 mr-1" />
                Приостановить
              </Button>
            )}

            {canResume && onResume && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResume(subscription.id)}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <Play className="w-4 h-4 mr-1" />
                Возобновить
              </Button>
            )}

            {canCancel && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(subscription.id)}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Отменить
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
} 