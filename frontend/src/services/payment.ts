// YooMoney payment service
import api from '@/lib/api'

interface PaymentData {
  amount: number
  currency: string
  description: string
  order_id: string
  customer_email?: string
  customer_phone?: string
  return_url?: string
}

interface YooMoneyConfig {
  shop_id: string
  secret_key: string
  test_mode: boolean
}

// Test credentials for YooMoney (sandbox)
const YOOMONEY_CONFIG: YooMoneyConfig = {
  shop_id: '123456', // Test shop ID - заменить на реальный в продакшене
  secret_key: 'test_secret', // Test secret - заменить на реальный в продакшене  
  test_mode: true // Всегда тестовый режим для демонстрации
}

// YooMoney test cards for sandbox
export const TEST_CARDS = {
  success: {
    number: '5555555555554444',
    expiry: '12/25',
    cvv: '123',
    description: 'Успешная оплата'
  },
  fail: {
    number: '5555555555554477',
    expiry: '12/25', 
    cvv: '123',
    description: 'Неудачная оплата'
  },
  threeds: {
    number: '5555555555554451',
    expiry: '12/25',
    cvv: '123', 
    description: 'Оплата с 3D-Secure'
  }
}

class PaymentService {
  
  // Create payment through backend
  static async createPayment(paymentData: PaymentData) {
    try {
      const response = await api.post('/payments/create', {
        ...paymentData,
        payment_method: 'yoomoney',
        test_mode: YOOMONEY_CONFIG.test_mode
      })
      
      return response.data
    } catch (error: any) {
      console.error('Payment creation failed:', error)
      throw new Error(error.response?.data?.detail || 'Ошибка создания платежа')
    }
  }

  // Process payment confirmation
  static async confirmPayment(payment_id: string, confirmation_token?: string) {
    try {
      const response = await api.post(`/payments/${payment_id}/confirm`, {
        confirmation_token
      })
      
      return response.data
    } catch (error: any) {
      console.error('Payment confirmation failed:', error)
      throw new Error(error.response?.data?.detail || 'Ошибка подтверждения платежа')
    }
  }

  // Get payment status
  static async getPaymentStatus(payment_id: string) {
    try {
      const response = await api.get(`/payments/${payment_id}/status`)
      return response.data
    } catch (error: any) {
      console.error('Failed to get payment status:', error)
      throw new Error('Ошибка получения статуса платежа')
    }
  }

  // Cancel payment
  static async cancelPayment(payment_id: string) {
    try {
      const response = await api.post(`/payments/${payment_id}/cancel`)
      return response.data
    } catch (error: any) {
      console.error('Payment cancellation failed:', error)
      throw new Error('Ошибка отмены платежа')
    }
  }

  // Refund payment
  static async refundPayment(payment_id: string, amount?: number) {
    try {
      const response = await api.post(`/payments/${payment_id}/refund`, {
        amount
      })
      return response.data
    } catch (error: any) {
      console.error('Payment refund failed:', error)
      throw new Error('Ошибка возврата платежа')
    }
  }

  // Generate YooMoney widget URL for iframe
  static generateWidgetUrl(payment_data: PaymentData): string {
    const params = new URLSearchParams({
      shop_id: YOOMONEY_CONFIG.shop_id,
      amount: payment_data.amount.toString(),
      currency: payment_data.currency,
      description: payment_data.description,
      order_id: payment_data.order_id,
      test_mode: YOOMONEY_CONFIG.test_mode.toString(),
      return_url: payment_data.return_url || `${window.location.origin}/payment/success`,
      ...(payment_data.customer_email && { customer_email: payment_data.customer_email }),
      ...(payment_data.customer_phone && { customer_phone: payment_data.customer_phone })
    })

    const baseUrl = YOOMONEY_CONFIG.test_mode 
      ? 'https://demo-money.yandex.ru/payments/external/confirmation'
      : 'https://money.yandex.ru/payments/external/confirmation'
    
    return `${baseUrl}?${params.toString()}`
  }

  // Create payment form for YooMoney
  static createPaymentForm(container: HTMLElement, payment_data: PaymentData) {
    // Clear container
    container.innerHTML = ''
    
    // Create iframe for YooMoney payment widget
    const iframe = document.createElement('iframe')
    iframe.src = this.generateWidgetUrl(payment_data)
    iframe.style.width = '100%'
    iframe.style.height = '500px'
    iframe.style.border = 'none'
    iframe.style.borderRadius = '8px'
    
    container.appendChild(iframe)
    
    // Listen for payment completion messages
    window.addEventListener('message', (event) => {
      if (event.origin !== (YOOMONEY_CONFIG.test_mode ? 'https://demo-money.yandex.ru' : 'https://money.yandex.ru')) {
        return
      }
      
      if (event.data.type === 'payment_success') {
        // Payment successful
        window.dispatchEvent(new CustomEvent('payment_success', { 
          detail: event.data 
        }))
      } else if (event.data.type === 'payment_error') {
        // Payment failed
        window.dispatchEvent(new CustomEvent('payment_error', { 
          detail: event.data 
        }))
      }
    })
  }

  // Validate payment amount
  static validateAmount(amount: number): boolean {
    return amount > 0 && amount <= 1000000 // YooMoney limit
  }

  // Format amount for display
  static formatAmount(amount: number, currency: string = 'RUB'): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Get payment method info
  static getPaymentMethods() {
    return [
      {
        id: 'yoomoney_card',
        name: 'Банковская карта',
        description: 'Visa, MasterCard, МИР',
        icon: '💳',
        fee: 0
      },
      {
        id: 'yoomoney_wallet',
        name: 'ЮMoney кошелек',
        description: 'Оплата с кошелька ЮMoney',
        icon: '👛',
        fee: 0
      },
      {
        id: 'yoomoney_sberbank',
        name: 'Сбербанк Онлайн',
        description: 'Оплата через Сбербанк Онлайн',
        icon: '🏦',
        fee: 0
      },
      {
        id: 'cash',
        name: 'Наличные',
        description: 'Оплата курьеру при получении',
        icon: '💰',
        fee: 0
      }
    ]
  }

  // Check if payment method is available
  static isPaymentMethodAvailable(method_id: string): boolean {
    const availableMethods = this.getPaymentMethods().map(m => m.id)
    return availableMethods.includes(method_id)
  }
}

export default PaymentService

// Payment hooks for React components
export const usePayment = () => {
  const createPayment = async (paymentData: PaymentData) => {
    return PaymentService.createPayment(paymentData)
  }

  const confirmPayment = async (payment_id: string, confirmation_token?: string) => {
    return PaymentService.confirmPayment(payment_id, confirmation_token)
  }

  const getPaymentStatus = async (payment_id: string) => {
    return PaymentService.getPaymentStatus(payment_id)
  }

  return {
    createPayment,
    confirmPayment,
    getPaymentStatus,
    paymentMethods: PaymentService.getPaymentMethods(),
    testCards: YOOMONEY_CONFIG.test_mode ? TEST_CARDS : null,
    formatAmount: PaymentService.formatAmount
  }
} 