// Service Worker for FlowerSub PWA
const CACHE_NAME = 'msk-flower-v1.1.0'
const urlsToCache = [
  '/',
  '/offline.html',
  '/flower-icon.svg',
  '/manifest.json'
]

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
      })
  )
})

// Push event for notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'У вас новое уведомление',
    icon: '/flower-icon.svg',
    badge: '/flower-icon.svg',
    vibrate: [100, 50, 100],
    data: event.data ? JSON.parse(event.data.text()) : {},
    actions: [
      {
        action: 'view',
        title: 'Посмотреть',
        icon: '/flower-icon.svg'
      },
      {
        action: 'close',
        title: 'Закрыть'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('MSK Flower', options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'view') {
    // Open the app
    event.waitUntil(
      clients.openWindow('/')
    )
  } else if (event.action === 'close') {
    // Just close the notification
    return
  } else {
    // Default action - open app
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

function doBackgroundSync() {
  // Handle offline actions when connection is restored
  return Promise.resolve()
}

// Message event for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-notifications') {
      event.waitUntil(checkForNewNotifications())
    }
  })
}

async function checkForNewNotifications() {
  try {
    const response = await fetch('/api/v1/notifications/unread-count')
    const data = await response.json()
    
    if (data.count > 0) {
      self.registration.showNotification('MSK Flower', {
        body: `У вас ${data.count} новых уведомлений`,
        icon: '/flower-icon.svg',
        badge: '/flower-icon.svg',
        tag: 'unread-count'
      })
    }
  } catch (error) {
    console.log('Failed to check notifications:', error)
  }
} 