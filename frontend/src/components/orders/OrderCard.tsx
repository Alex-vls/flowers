import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Package, CreditCard, Truck, CheckCircle } from 'lucide-react'
import { Order } from '@/types'
import { formatPrice, formatDate } from '@/lib/utils'
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@/constants'
import { Badge, Button, Card } from '@/components/ui'

interface OrderCardProps {
  order: Order
  onCancel?: (orderId: number) => void
}

export default function OrderCard({ order, onCancel }: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const statusInfo = ORDER_STATUSES.find(s => s.id === order.status)
  const paymentStatusInfo = PAYMENT_STATUSES.find(s => s.id === order.payment_status)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'delivering':
        return <Truck className="w-5 h-5 text-blue-600" />
      case 'preparing':
        return <Package className="w-5 h-5 text-yellow-600" />
      default:
        return <Package className="w-5 h-5 text-gray-600" />
    }
  }

  const canCancel = order.status === 'pending' || order.status === 'confirmed'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Заказ #{order.order_number}
            </h3>
            <p className="text-sm text-gray-500">
              Создан {formatDate(order.created_at)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(order.status)}
            <Badge color={statusInfo?.color as any}>
              {statusInfo?.name}
            </Badge>
          </div>
        </div>

        {/* Order details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Доставка: {formatDate(order.delivery_date)}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{order.delivery_address}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <CreditCard className="w-4 h-4" />
            <span>Оплата: {paymentStatusInfo?.name}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Package className="w-4 h-4" />
            <span>{order.items.length} товаров</span>
          </div>
        </div>

        {/* Items preview */}
        {!isExpanded && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {order.items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center space-x-2 text-sm">
                  <img
                    src={item.flower.image_url || '/placeholder-flower.jpg'}
                    alt={item.flower.name}
                    className="w-8 h-8 rounded object-cover"
                  />
                  <span className="text-gray-700">
                    {item.flower.name} × {item.quantity}
                  </span>
                </div>
              ))}
              {order.items.length > 3 && (
                <span className="text-sm text-gray-500">
                  +{order.items.length - 3} еще
                </span>
              )}
            </div>
          </div>
        )}

        {/* Expanded items */}
        {isExpanded && (
          <div className="mb-4 border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Товары в заказе:</h4>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={item.flower.image_url || '/placeholder-flower.jpg'}
                      alt={item.flower.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{item.flower.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatPrice(item.price)} × {item.quantity}
                      </p>
                    </div>
                  </div>
                  <p className="font-medium text-gray-900">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total and actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="text-lg font-bold text-gray-900">
              Итого: {formatPrice(order.total)}
            </p>
            {order.delivery_fee > 0 && (
              <p className="text-sm text-gray-500">
                Включая доставку: {formatPrice(order.delivery_fee)}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Скрыть детали' : 'Показать детали'}
            </Button>
            
            <Link to={`/orders/${order.id}`}>
              <Button size="sm">
                Подробнее
              </Button>
            </Link>

            {canCancel && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(order.id)}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Отменить
              </Button>
            )}
          </div>
        </div>

        {/* Tracking info */}
        {order.tracking_number && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Трек-номер:</strong> {order.tracking_number}
            </p>
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Примечание:</strong> {order.notes}
            </p>
          </div>
        )}
      </div>
    </Card>
  )
} 