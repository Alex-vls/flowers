// Yandex.Metrica service
export class MetricsService {
  private static instance: MetricsService
  private counterId: string | null = null
  private isInitialized = false

  private constructor() {}

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService()
    }
    return MetricsService.instance
  }

  // Initialize Yandex.Metrica
  init(counterId: string): void {
    if (this.isInitialized) return

    this.counterId = counterId
    this.isInitialized = true

    // Load Yandex.Metrica script
    const script = document.createElement('script')
    script.async = true
    script.src = `https://mc.yandex.ru/metrika/tag.js`
    document.head.appendChild(script)

    // Initialize counter
    window.ym = window.ym || function() {
      (window.ym as any).a = (window.ym as any).a || []
      ;(window.ym as any).a.push(arguments)
    }
    ;(window.ym as any).l = 1 * new Date()

    // Add counter
    ;(window.ym as any)(counterId, 'init', {
      id: counterId,
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
    })

    // Add noscript fallback
    const noscript = document.createElement('noscript')
    const img = document.createElement('img')
    img.src = `https://mc.yandex.ru/watch/${counterId}`
    img.style.position = 'absolute'
    img.style.left = '-9999px'
    noscript.appendChild(img)
    document.head.appendChild(noscript)
  }

  // Track page view
  trackPageView(url?: string): void {
    if (!this.isInitialized || !this.counterId) return

    ;(window.ym as any)(this.counterId, 'hit', url || window.location.href)
  }

  // Track custom event
  trackEvent(category: string, action: string, label?: string, value?: number): void {
    if (!this.isInitialized || !this.counterId) return

    ;(window.ym as any)(this.counterId, 'reachGoal', 'custom_event', {
      category,
      action,
      label,
      value,
    })
  }

  // Track ecommerce events
  trackPurchase(orderId: string, total: number, currency: string = 'RUB'): void {
    if (!this.isInitialized || !this.counterId) return

    ;(window.ym as any)(this.counterId, 'reachGoal', 'purchase', {
      order_id: orderId,
      total,
      currency,
    })
  }

  trackAddToCart(productId: string, price: number, quantity: number = 1): void {
    if (!this.isInitialized || !this.counterId) return

    ;(window.ym as any)(this.counterId, 'reachGoal', 'add_to_cart', {
      product_id: productId,
      price,
      quantity,
    })
  }

  // Track user registration
  trackRegistration(method: string = 'email'): void {
    if (!this.isInitialized || !this.counterId) return

    ;(window.ym as any)(this.counterId, 'reachGoal', 'registration', {
      method,
    })
  }

  // Track subscription creation
  trackSubscription(subscriptionId: string, frequency: string, total: number): void {
    if (!this.isInitialized || !this.counterId) return

    ;(window.ym as any)(this.counterId, 'reachGoal', 'subscription', {
      subscription_id: subscriptionId,
      frequency,
      total,
    })
  }

  // Track search
  trackSearch(query: string, resultsCount: number): void {
    if (!this.isInitialized || !this.counterId) return

    ;(window.ym as any)(this.counterId, 'reachGoal', 'search', {
      query,
      results_count: resultsCount,
    })
  }

  // Track contact actions
  trackContact(method: string): void {
    if (!this.isInitialized || !this.counterId) return

    ;(window.ym as any)(this.counterId, 'reachGoal', 'contact', {
      method,
    })
  }
}

// Export singleton instance
export const metricsService = MetricsService.getInstance()

// Declare global types
declare global {
  interface Window {
    ym: any
  }
} 