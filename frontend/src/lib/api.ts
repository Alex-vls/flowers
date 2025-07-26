import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store'

// API base URL - используем относительный путь для production
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // ✅ ИСПРАВЛЕНО: Сначала authStore (надежно), потом localStorage (fallback)
    const token = useAuthStore.getState().token || 
                 localStorage.getItem('access_token')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // ✅ ИСПРАВЛЕНО: Берем refresh token из localStorage ИЛИ authStore
      const refreshToken = localStorage.getItem('refresh_token') || 
                          useAuthStore.getState().refreshToken
                          
      console.log('🔄 Refresh token attempt:', {
        hasLocalStorage: !!localStorage.getItem('refresh_token'),
        hasAuthStore: !!useAuthStore.getState().refreshToken,
        usingToken: refreshToken ? 'ЕСТЬ' : 'НЕТ'
      })
      
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })

          const { access_token, refresh_token: newRefreshToken } = response.data
          
          // ✅ ИСПРАВЛЕНО: Сохраняем в оба хранилища
          try {
            localStorage.setItem('access_token', access_token)
            localStorage.setItem('refresh_token', newRefreshToken)
            console.log('✅ Tokens refreshed in localStorage')
          } catch (localStorageError) {
            console.warn('❌ Failed to save to localStorage:', localStorageError)
          }
          
          // ✅ ГЛАВНОЕ: Обновляем authStore (это всегда работает)
          const { login } = useAuthStore.getState()
          login(useAuthStore.getState().user, access_token)
          console.log('✅ Token refreshed in authStore')

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError)
          // Refresh failed, clear tokens and redirect to login
          try {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
          } catch (e) {
            console.warn('Failed to clear localStorage:', e)
          }
          
          // Clear authStore
          useAuthStore.getState().logout()
          
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        console.warn('❌ No refresh token available')
        // No refresh token, clear everything and redirect to login
        try {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        } catch (e) {
          console.warn('Failed to clear localStorage:', e)
        }
        
        // Clear authStore
        useAuthStore.getState().logout()
        
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    // Handle other errors
    const message = error.response?.data?.detail || error.message || 'Произошла ошибка'
    toast.error(message)

    return Promise.reject(error)
  }
)

// API methods
export const apiClient = {
  // Auth
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  telegramAuth: (data: { telegram_id: number; first_name: string; last_name?: string; username?: string }) =>
    api.post('/auth/telegram-auth', data),
  
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post('/auth/register', data),
  
  refreshToken: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),
  
  // Users
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: any) => api.put('/users/me', data),
  
  // Flowers
  getFlowers: (params?: any) => api.get('/flowers', { params }),
  getFlower: (id: number) => api.get(`/flowers/${id}`),
  getPopularFlowers: (limit?: number) => 
    api.get('/flowers/popular', { params: { limit } }),
  getSeasonalFlowers: () => api.get('/flowers/seasonal'),
  searchFlowers: (query: string, limit?: number) =>
    api.get('/flowers/search', { params: { query, limit } }),
  
  // Subscriptions
  getSubscriptions: (params?: any) => api.get('/subscriptions', { params }),
  getSubscription: (id: number) => api.get(`/subscriptions/${id}`),
  createSubscription: (data: any) => api.post('/subscriptions', data),
  updateSubscription: (id: number, data: any) => 
    api.put(`/subscriptions/${id}`, data),
  pauseSubscription: (id: number, data: any) =>
    api.post(`/subscriptions/${id}/pause`, data),
  resumeSubscription: (id: number, data: any) =>
    api.post(`/subscriptions/${id}/resume`, data),
  cancelSubscription: (id: number) =>
    api.post(`/subscriptions/${id}/cancel`),
  
  // Orders
  getOrders: (params?: any) => api.get('/orders', { params }),
  getOrder: (id: number) => api.get(`/orders/${id}`),
  createOrder: (data: any) => api.post('/orders', data),
  cancelOrder: (id: number) => api.post(`/orders/${id}/cancel`),
  
  // Payments
  getPayments: (params?: any) => api.get('/payments', { params }),
  createPayment: (order_id: number, method: string) =>
    api.post('/payments/create', { order_id, method }),
  processPayment: (payment_id: number) =>
    api.post(`/payments/${payment_id}/process`),
  
  // Bonuses
  getBonuses: (params?: any) => api.get('/bonuses/my-bonuses', { params }),
  getReferrals: () => api.get('/bonuses/my-referrals'),
  generateReferralCode: () => api.post('/bonuses/referral-code'),
  useReferralCode: (code: string) => 
    api.post('/bonuses/use-referral', { referral_code: code }),
  getGiftCertificates: () => api.get('/bonuses/gift-certificates'),
  activateGiftCertificate: (code: string) =>
    api.post('/bonuses/gift-certificates/activate', { code }),
  
  // Reviews
  getReviews: (params?: any) => api.get('/reviews', { params }),
  getFlowerReviews: (flowerId: number, params?: any) => 
    api.get(`/reviews?flower_id=${flowerId}`, { params }),
  createReview: (data: any) => api.post('/reviews', data),
  addReview: (data: { flower_id: number; rating: number; comment: string; photos?: string[] }) => 
    api.post('/reviews', data),
  updateReview: (id: number, data: any) => api.put(`/reviews/${id}`, data),
  deleteReview: (id: number) => api.delete(`/reviews/${id}`),
  voteReview: (id: number, helpful: boolean) =>
    api.post(`/reviews/${id}/vote`, { helpful }),
  
  // Admin Review Moderation
  getPendingReviews: (params?: any) => 
    api.get('/reviews/admin/pending', { params }),
  approveReview: (reviewId: number) =>
    api.post(`/reviews/admin/${reviewId}/approve`),
  rejectReview: (reviewId: number, reason: string) =>
    api.post(`/reviews/admin/${reviewId}/reject`, null, { params: { reason } }),
  getReviewStats: () =>
    api.get('/reviews/admin/stats'),
  
  // Notifications
  getNotifications: (params?: any) => api.get('/notifications', { params }),
  markNotificationRead: (id: number) => 
    api.post(`/notifications/${id}/read`),
  markAllNotificationsRead: () => api.post('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
}

// Telegram diagnostics
export const submitTelegramDiagnostics = async (diagnosticsData: any) => {
  try {
    const response = await api.post('/monitoring/telegram-diagnostics', diagnosticsData)
    return response.data
  } catch (error) {
    console.error('Failed to submit diagnostics:', error)
    throw error
  }
}

export default api 