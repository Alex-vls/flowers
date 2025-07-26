import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Button, Badge } from '@/components/ui'
import api from '@/lib/api'
import { 
  Truck, 
  Package, 
  Clock, 
  CheckCircle, 
  MapPin, 
  Phone, 
  User,
  RefreshCw,
  AlertCircle,
  Calendar
} from 'lucide-react'

interface DeliveryTrackerProps {
  orderId: number
  claimId?: string
  compact?: boolean
  showRefresh?: boolean
}

interface DeliveryStatus {
  claim_id: string
  status: string
  yandex_status: string
  updated_ts?: string
  route_points: any[]
  courier_info?: {
    name: string
    phone: string
    transport_type: string
  }
}

export default function DeliveryTracker({ 
  orderId, 
  claimId, 
  compact = false, 
  showRefresh = true 
}: DeliveryTrackerProps) {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Fetch delivery status
  const { 
    data: deliveryStatus, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['delivery-status', claimId],
    queryFn: async () => {
      if (!claimId) return null
      const response = await api.get(`/delivery/status/${claimId}`)
      return response.data?.data as DeliveryStatus
    },
    enabled: !!claimId,
    refetchInterval: 60000, // Refresh every minute
  })

  const handleRefresh = () => {
    refetch()
    setLastRefresh(new Date())
  }

  const getStatusInfo = (status: string) => {
    const statusMap = {
      created: { 
        label: 'Заказ создан', 
        color: 'bg-blue-100 text-blue-800',
        icon: <Package className="w-4 h-4" />,
        description: 'Заказ передан в службу доставки'
      },
      processing: { 
        label: 'В обработке', 
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="w-4 h-4" />,
        description: 'Подбираем курьера для доставки'
      },
      pickup_arrived: { 
        label: 'Курьер прибыл', 
        color: 'bg-orange-100 text-orange-800',
        icon: <MapPin className="w-4 h-4" />,
        description: 'Курьер прибыл за заказом'
      },
      ready_for_pickup: { 
        label: 'Готов к забору', 
        color: 'bg-blue-100 text-blue-800',
        icon: <Package className="w-4 h-4" />,
        description: 'Заказ готов к передаче курьеру'
      },
      picked_up: { 
        label: 'Забран курьером', 
        color: 'bg-purple-100 text-purple-800',
        icon: <Truck className="w-4 h-4" />,
        description: 'Заказ в пути к месту доставки'
      },
      delivery_arrived: { 
        label: 'Курьер на месте', 
        color: 'bg-green-100 text-green-800',
        icon: <MapPin className="w-4 h-4" />,
        description: 'Курьер прибыл по адресу доставки'
      },
      ready_for_delivery: { 
        label: 'Готов к выдаче', 
        color: 'bg-green-100 text-green-800',
        icon: <Package className="w-4 h-4" />,
        description: 'Заказ готов к получению'
      },
      delivered: { 
        label: 'Доставлен', 
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="w-4 h-4" />,
        description: 'Заказ успешно доставлен'
      },
      cancelled: { 
        label: 'Отменен', 
        color: 'bg-red-100 text-red-800',
        icon: <AlertCircle className="w-4 h-4" />,
        description: 'Доставка отменена'
      },
      failed: { 
        label: 'Ошибка доставки', 
        color: 'bg-red-100 text-red-800',
        icon: <AlertCircle className="w-4 h-4" />,
        description: 'Произошла ошибка при доставке'
      }
    }

    return statusMap[status as keyof typeof statusMap] || {
      label: status,
      color: 'bg-gray-100 text-gray-800',
      icon: <Clock className="w-4 h-4" />,
      description: 'Неизвестный статус'
    }
  }

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return null
    
    const date = new Date(timestamp)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!claimId) {
    return (
      <Card className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Package className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <div className="font-medium text-gray-900">Доставка не назначена</div>
            <div className="text-sm text-gray-500">Заказ еще не передан в службу доставки</div>
          </div>
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-gray-500 animate-spin" />
          </div>
          <div>
            <div className="font-medium text-gray-900">Загрузка статуса...</div>
            <div className="text-sm text-gray-500">Получаем информацию о доставке</div>
          </div>
        </div>
      </Card>
    )
  }

  if (error || !deliveryStatus) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900">Ошибка загрузки</div>
              <div className="text-sm text-gray-500">Не удалось получить статус доставки</div>
            </div>
          </div>
          {showRefresh && (
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    )
  }

  const statusInfo = getStatusInfo(deliveryStatus.status)

  // Compact version
  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusInfo.color}`}>
          {statusInfo.icon}
        </div>
        <div>
          <div className="font-medium text-sm">{statusInfo.label}</div>
          {deliveryStatus.updated_ts && (
            <div className="text-xs text-gray-500">
              {formatTime(deliveryStatus.updated_ts)}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Full version
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <Truck className="w-5 h-5 mr-2" />
          Отслеживание доставки
        </h3>
        {showRefresh && (
          <div className="flex items-center space-x-3">
            <div className="text-xs text-gray-500">
              Обновлено: {lastRefresh.toLocaleTimeString('ru-RU')}
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Current Status */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusInfo.color}`}>
            {statusInfo.icon}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-lg text-gray-900">{statusInfo.label}</div>
            <div className="text-gray-600 text-sm">{statusInfo.description}</div>
            {deliveryStatus.updated_ts && (
              <div className="text-xs text-gray-500 mt-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                {formatTime(deliveryStatus.updated_ts)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Courier Info */}
      {deliveryStatus.courier_info && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <User className="w-4 h-4 mr-2" />
            Информация о курьере
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Курьер:</div>
              <div className="font-medium">{deliveryStatus.courier_info.name}</div>
            </div>
            <div>
              <div className="text-gray-600">Телефон:</div>
              <div className="font-medium flex items-center">
                <Phone className="w-3 h-3 mr-1" />
                <a 
                  href={`tel:${deliveryStatus.courier_info.phone}`}
                  className="text-blue-600 hover:underline"
                >
                  {deliveryStatus.courier_info.phone}
                </a>
              </div>
            </div>
            {deliveryStatus.courier_info.transport_type && (
              <div>
                <div className="text-gray-600">Транспорт:</div>
                <div className="font-medium">{deliveryStatus.courier_info.transport_type}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delivery Timeline */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Этапы доставки</h4>
        
        {/* Progress steps */}
        <div className="space-y-3">
          {[
            'created',
            'processing', 
            'picked_up',
            'delivery_arrived',
            'delivered'
          ].map((step, index) => {
            const stepInfo = getStatusInfo(step)
            const isCompleted = ['delivered', 'cancelled'].includes(deliveryStatus.status) || 
                             (step === deliveryStatus.status)
            const isCurrent = step === deliveryStatus.status
            const isPast = ['delivered', 'cancelled'].includes(deliveryStatus.status) && 
                          index < ['created', 'processing', 'picked_up', 'delivery_arrived', 'delivered'].indexOf(deliveryStatus.status)

            return (
              <div key={step} className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  isCurrent ? 'border-blue-500 bg-blue-500 text-white' :
                  isPast || isCompleted ? 'border-green-500 bg-green-500 text-white' :
                  'border-gray-300 bg-gray-100'
                }`}>
                  {isPast || isCompleted ? 
                    <CheckCircle className="w-4 h-4" /> : 
                    stepInfo.icon
                  }
                </div>
                <div className={`flex-1 ${isCurrent ? 'font-semibold' : ''}`}>
                  <div className={isCurrent ? 'text-blue-600' : isPast || isCompleted ? 'text-green-600' : 'text-gray-500'}>
                    {stepInfo.label}
                  </div>
                  {!compact && (
                    <div className="text-xs text-gray-500">{stepInfo.description}</div>
                  )}
                </div>
                {isCurrent && deliveryStatus.updated_ts && (
                  <div className="text-xs text-gray-500">
                    {formatTime(deliveryStatus.updated_ts)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          ID отслеживания: {deliveryStatus.claim_id}
        </div>
        {deliveryStatus.yandex_status !== deliveryStatus.status && (
          <div className="text-xs text-gray-500">
            Статус Яндекс.Доставки: {deliveryStatus.yandex_status}
          </div>
        )}
      </div>
    </Card>
  )
} 