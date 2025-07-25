// Push notifications service
export class PushService {
  private static instance: PushService
  private isSupported = 'serviceWorker' in navigator && 'PushManager' in window
  private isSubscribed = false

  private constructor() {}

  static getInstance(): PushService {
    if (!PushService.instance) {
      PushService.instance = new PushService()
    }
    return PushService.instance
  }

  // Check if push notifications are supported
  isPushSupported(): boolean {
    return this.isSupported
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  // Subscribe to push notifications
  async subscribe(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported')
      return false
    }

    try {
      // Check permission
      const permission = await this.requestPermission()
      if (!permission) {
        console.warn('Notification permission denied')
        return false
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.VITE_VAPID_PUBLIC_KEY || ''),
      })

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription)

      this.isSubscribed = true
      console.log('Push notification subscription successful')
      return true
    } catch (error) {
      console.error('Error subscribing to push notifications:', error)
      return false
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    if (!this.isSupported) {
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
        await this.removeSubscriptionFromServer(subscription)
        this.isSubscribed = false
        console.log('Push notification unsubscription successful')
        return true
      }

      return false
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error)
      return false
    }
  }

  // Check subscription status
  async checkSubscription(): Promise<boolean> {
    if (!this.isSupported) {
      return false
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      this.isSubscribed = !!subscription
      return this.isSubscribed
    } catch (error) {
      console.error('Error checking subscription status:', error)
      return false
    }
  }

  // Send subscription to server
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/v1/notifications/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send subscription to server')
      }
    } catch (error) {
      console.error('Error sending subscription to server:', error)
      throw error
    }
  }

  // Remove subscription from server
  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/v1/notifications/push-subscription', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to remove subscription from server')
      }
    } catch (error) {
      console.error('Error removing subscription from server:', error)
      throw error
    }
  }

  // Convert VAPID public key to Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  // Show local notification
  showNotification(title: string, options?: NotificationOptions): void {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported')
      return
    }

    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/flower-icon.svg',
        badge: '/flower-icon.svg',
        ...options,
      })
    }
  }
}

// Export singleton instance
export const pushService = PushService.getInstance() 