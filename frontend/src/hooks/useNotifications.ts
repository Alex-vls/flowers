import { useNotificationStore } from '@/store'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'
import { Notification } from '@/types'

export function useNotifications() {
  const { unreadCount, setUnreadCount, incrementUnread, decrementUnread } = useNotificationStore()
  const queryClient = useQueryClient()

  // Get notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await apiClient.getNotifications()
      return response.data
    },
  })

  // Get unread count
  const { data: unreadCountData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await apiClient.getUnreadCount()
      return response.data
    },
    onSuccess: (data) => {
      setUnreadCount(data.count)
    },
  })

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiClient.markNotificationRead(notificationId)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      decrementUnread()
    },
  })

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.markAllNotificationsRead()
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      setUnreadCount(0)
      toast.success('Все уведомления отмечены как прочитанные')
    },
  })

  // Mark notification as read
  const markAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId)
  }

  // Mark all as read
  const markAllAsRead = () => {
    markAllAsReadMutation.mutate()
  }

  return {
    notifications: notifications || [],
    unreadCount: unreadCountData?.count || unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  }
} 