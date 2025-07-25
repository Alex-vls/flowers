import { create } from 'zustand'
import { Notification } from '@/types'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
}

interface NotificationActions {
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markAsRead: (notificationId: number) => void
  markAllAsRead: () => void
  removeNotification: (notificationId: number) => void
  clearNotifications: () => void
  setLoading: (loading: boolean) => void
  updateUnreadCount: () => void
}

type NotificationStore = NotificationState & NotificationActions

export const useNotificationStore = create<NotificationStore>()(
  (set, get) => ({
    // State
    notifications: [],
    unreadCount: 0,
    isLoading: false,

    // Actions
    setNotifications: (notifications) => {
      const unreadCount = notifications.filter(n => !n.is_read).length
      set({ notifications, unreadCount })
    },

    addNotification: (notification) => {
      set((state) => {
        const newNotifications = [notification, ...state.notifications]
        const unreadCount = newNotifications.filter(n => !n.is_read).length
        return {
          notifications: newNotifications,
          unreadCount
        }
      })
    },

    markAsRead: (notificationId) => {
      set((state) => {
        const updatedNotifications = state.notifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
        const unreadCount = updatedNotifications.filter(n => !n.is_read).length
        return {
          notifications: updatedNotifications,
          unreadCount
        }
      })
    },

    markAllAsRead: () => {
      set((state) => {
        const updatedNotifications = state.notifications.map(notification => ({
          ...notification,
          is_read: true
        }))
        return {
          notifications: updatedNotifications,
          unreadCount: 0
        }
      })
    },

    removeNotification: (notificationId) => {
      set((state) => {
        const updatedNotifications = state.notifications.filter(
          notification => notification.id !== notificationId
        )
        const unreadCount = updatedNotifications.filter(n => !n.is_read).length
        return {
          notifications: updatedNotifications,
          unreadCount
        }
      })
    },

    clearNotifications: () => {
      set({
        notifications: [],
        unreadCount: 0
      })
    },

    setLoading: (isLoading) => {
      set({ isLoading })
    },

    updateUnreadCount: () => {
      const state = get()
      const unreadCount = state.notifications.filter(n => !n.is_read).length
      set({ unreadCount })
    }
  })
) 