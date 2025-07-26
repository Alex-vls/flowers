import { Routes, Route } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'

import Layout from '@/components/Layout'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuthStore } from '@/store'

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

  // Initialize auth state from localStorage on app start
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const userStr = localStorage.getItem('auth-storage')
    
    if (token && userStr) {
      try {
        const authData = JSON.parse(userStr)
        if (authData?.state?.user) {
          setUser(authData.state.user)
          setToken(token)
        }
      } catch (error) {
        console.error('Error parsing auth data:', error)
        // Clear invalid data
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('auth-storage')
      }
    }
  }, [setUser, setToken])

  return (
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
          <Route path="/telegram" element={<TelegramApp />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default App 