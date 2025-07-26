import { Routes, Route } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'

import Layout from '@/components/Layout'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuthStore } from '@/store'
import { getValidToken, clearAuthData, validateToken } from '@/lib/tokenUtils'

// Lazy load pages
const HomePage = lazy(() => import('@/pages/HomePage'))
const CatalogPage = lazy(() => import('@/pages/CatalogPage'))
const FlowerDetailPage = lazy(() => import('@/pages/FlowerDetailPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const PaymentSuccessPage = lazy(() => import('@/pages/PaymentSuccessPage'))
const SubscriptionPage = lazy(() => import('@/pages/SubscriptionPage'))
const OrdersPage = lazy(() => import('@/pages/OrdersPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const BonusPage = lazy(() => import('@/pages/BonusPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const AdminPage = lazy(() => import('@/pages/AdminPage'))
const NewsPage = lazy(() => import('@/pages/NewsPage'))
const SupportPage = lazy(() => import('@/pages/SupportPage'))
const PolicyPage = lazy(() => import('@/pages/PolicyPage'))
const TelegramApp = lazy(() => import('@/pages/TelegramApp'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

function App() {
  const { setUser, setToken } = useAuthStore()

  // Initialize auth state from localStorage with token validation
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Убрали обработку URL параметров telegram_auth
        // Теперь используется стандартный popup flow для всех браузеров
        
        // Обычная инициализация из localStorage
        // Получаем валидный токен (с автоматической очисткой если невалидный)
        const validToken = getValidToken()
        const userStr = localStorage.getItem('auth-storage')
        
        if (validToken && userStr) {
          const authData = JSON.parse(userStr)
          if (authData?.state?.user) {
            // Дополнительная проверка токена
            const tokenValidation = validateToken(validToken)
            
            if (tokenValidation.isValid) {
              setUser(authData.state.user)
              setToken(validToken)
              
              console.log(`🔐 Auth initialized. Token expires in ${tokenValidation.timeRemaining} minutes`)
              
              // Предупреждение если токен скоро истечет
              if (tokenValidation.timeRemaining < 10) {
                console.warn('⚠️ Token expires soon, consider refreshing')
              }
            } else {
              console.warn('❌ Token validation failed:', tokenValidation.error)
              clearAuthData()
            }
          }
        } else {
          // Нет валидного токена или пользовательских данных
          if (!validToken) {
            console.log('🔓 No valid token found')
          }
          if (!userStr) {
            console.log('👤 No user data found')
          }
        }
      } catch (error) {
        console.error('💥 Error initializing auth:', error)
        clearAuthData()
      }
    }

    initializeAuth()
  }, [setUser, setToken])

  return (
    <Routes>
      {/* Telegram Mini App without Layout */}
      <Route path="/telegram" element={
        <Suspense fallback={<LoadingSpinner />}>
          <TelegramApp />
        </Suspense>
      } />
      
      {/* All other routes with Layout */}
      <Route path="/*" element={
        <Layout>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/flower/:id" element={<FlowerDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/payment/success" element={<PaymentSuccessPage />} />
              <Route path="/subscription" element={<SubscriptionPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/bonuses" element={<BonusPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/admin/*" element={<AdminPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/policy" element={<PolicyPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </Layout>
      } />
    </Routes>
  )
}

export default App 