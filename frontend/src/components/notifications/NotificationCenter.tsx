import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api'
import { Button, Badge, Modal, Card } from '@/components/ui'
import { 
  Bell, 
  BellRing,
  X, 
  Check,
  Package,
  Truck,
  Gift,
  CreditCard,
  AlertCircle,
  Info,
  CheckCircle,
  Star,
  Calendar,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react'

interface Notification {
  id: number
  user_id: number
  type: 'order_update' | 'delivery_reminder' | 'payment' | 'bonus' | 'promotion' | 'review_request' | 'subscription'
  title: string
  message: string
  data?: Record<string, any>
  is_read: boolean
  is_push_sent: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  action_url?: string
  expires_at?: string
  created_at: string
}

interface NotificationCenterProps {
  onClose?: () => void
}

export default function NotificationCenter({ onClose }: NotificationCenterProps) {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'order' | 'promotion'>('all')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Fetch notifications
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: async () => {
      if (!isAuthenticated) return []
      const params: any = {}
      if (filter === 'unread') params.is_read = false
      if (filter === 'order') params.type = 'order_update,delivery_reminder'
      if (filter === 'promotion') params.type = 'promotion,bonus'
      
      const response = await apiClient.getNotifications(params)
      return response.data || []
    },
    enabled: isAuthenticated,
    refetchInterval: 30000, // Poll every 30 seconds
  })

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      if (!isAuthenticated) return 0
      const response = await apiClient.getUnreadCount()
      return response.data?.count || 0
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
  })

  // Mark notification as read
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiClient.markNotificationRead(notificationId)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    }
  })

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.markAllNotificationsRead()
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    }
  })

  // Request push permission
  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      alert('Ваш браузер не поддерживает push-уведомления')
      return
    }

    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      setPushEnabled(true)
      // Register service worker for push notifications
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
      }
    }
  }

  // Show browser notification
  const showBrowserNotification = (notification: Notification) => {
    if (!pushEnabled || Notification.permission !== 'granted') return

    const options = {
      body: notification.message,
      icon: '/flower-icon.svg',
      badge: '/flower-icon.svg',
      tag: notification.id.toString(),
      data: notification.data,
      requireInteraction: notification.priority === 'urgent',
    }

    const notif = new Notification(notification.title, options)
    
    notif.onclick = () => {
      window.focus()
      if (notification.action_url) {
        window.location.href = notification.action_url
      }
      notif.close()
    }

    // Play sound if enabled
    if (soundEnabled) {
      const audio = new Audio('/notification-sound.mp3')
      audio.play().catch(() => {}) // Ignore if sound fails
    }
  }

  // Simulate real-time notifications (in real app would use WebSocket)
  useEffect(() => {
    if (!isAuthenticated) return

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    }, 30000)

    return () => clearInterval(interval)
  }, [isAuthenticated, queryClient])

  // Check for new notifications and show browser notifications
  useEffect(() => {
    const lastCheck = localStorage.getItem('lastNotificationCheck')
    const now = new Date().toISOString()
    
    if (lastCheck && notifications.length > 0) {
      const newNotifications = notifications.filter(
        (notif: Notification) => notif.created_at > lastCheck && !notif.is_read
      )
      
      newNotifications.forEach(showBrowserNotification)
    }
    
    localStorage.setItem('lastNotificationCheck', now)
  }, [notifications, pushEnabled, soundEnabled])

  // Check initial push permission
  useEffect(() => {
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted')
    }
  }, [])

  const getNotificationIcon = (type: Notification['type']) => {
    const iconMap = {
      order_update: Package,
      delivery_reminder: Truck,
      payment: CreditCard,
      bonus: Gift,
      promotion: Star,
      review_request: Star,
      subscription: Calendar,
    }
    return iconMap[type] || Bell
  }

  const getNotificationColor = (type: Notification['type'], priority: Notification['priority']) => {
    if (priority === 'urgent') return 'text-red-600 bg-red-100'
    if (priority === 'high') return 'text-orange-600 bg-orange-100'
    
    const colorMap = {
      order_update: 'text-blue-600 bg-blue-100',
      delivery_reminder: 'text-green-600 bg-green-100',
      payment: 'text-purple-600 bg-purple-100',
      bonus: 'text-yellow-600 bg-yellow-100',
      promotion: 'text-pink-600 bg-pink-100',
      review_request: 'text-indigo-600 bg-indigo-100',
      subscription: 'text-teal-600 bg-teal-100',
    }
    return colorMap[type] || 'text-gray-600 bg-gray-100'
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} мин назад`
    if (diffHours < 24) return `${diffHours} ч назад`
    if (diffDays < 7) return `${diffDays} дн назад`
    return date.toLocaleDateString('ru-RU')
  }

  const filteredNotifications = notifications.filter((notif: Notification) => {
    if (filter === 'all') return true
    if (filter === 'unread') return !notif.is_read
    if (filter === 'order') return ['order_update', 'delivery_reminder'].includes(notif.type)
    if (filter === 'promotion') return ['promotion', 'bonus'].includes(notif.type)
    return true
  })

  if (!isAuthenticated) return null

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-6 h-6" />
        ) : (
          <Bell className="w-6 h-6" />
        )}
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 bg-red-500 text-white min-w-[18px] h-[18px] text-xs rounded-full flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[600px] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                Уведомления
              </h3>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1"
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="p-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex space-x-2 mb-3">
              {[
                { key: 'all', label: 'Все' },
                { key: 'unread', label: 'Непрочитанные' },
                { key: 'order', label: 'Заказы' },
                { key: 'promotion', label: 'Акции' },
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  size="sm"
                  variant={filter === key ? "default" : "outline"}
                  onClick={() => setFilter(key as any)}
                  className="text-xs"
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Отметить все прочитанными
                </Button>
              )}
              
              {!pushEnabled && (
                <Button
                  size="sm"
                  onClick={requestPushPermission}
                  className="bg-green-600 hover:bg-green-700 text-xs"
                >
                  Включить уведомления
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-500 mt-2">Загружаем уведомления...</p>
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredNotifications.map((notification: Notification) => {
                  const IconComponent = getNotificationIcon(notification.type)
                  const colorClasses = getNotificationColor(notification.type, notification.priority)
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                      onClick={() => {
                        if (!notification.is_read) {
                          markReadMutation.mutate(notification.id)
                        }
                        if (notification.action_url) {
                          window.location.href = notification.action_url
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full flex-shrink-0 ${colorClasses}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`text-sm font-medium ${
                              !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h4>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                          
                          <p className={`text-sm ${
                            !notification.is_read ? 'text-gray-800' : 'text-gray-600'
                          }`}>
                            {notification.message}
                          </p>
                          
                          {notification.priority === 'urgent' && (
                            <Badge className="bg-red-100 text-red-800 text-xs mt-2">
                              Срочно
                            </Badge>
                          )}
                        </div>
                        
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <Bell className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Нет уведомлений
                </h3>
                <p className="text-gray-500">
                  {filter === 'unread' 
                    ? 'У вас нет непрочитанных уведомлений'
                    : 'Уведомления появятся здесь'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Обновлено {formatTime(new Date().toISOString())}</span>
              <button className="hover:text-gray-900">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 