import { useAuthStore } from '@/store'
import { apiClient } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { User, LoginForm, RegisterForm } from '@/types'

export function useAuth() {
  const { user, isAuthenticated, login, logout, setLoading } = useAuthStore()
  const queryClient = useQueryClient()

  // Get current user profile
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await apiClient.getProfile()
      return response.data
    },
    enabled: isAuthenticated,
  })

  // ✅ НОВОЕ: Telegram Mini App авторизация
  const telegramMiniAppMutation = useMutation({
    mutationFn: async (initData: string) => {
      const response = await fetch('/api/v1/auth/telegram-miniapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          init_data: initData
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Ошибка авторизации')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      // ✅ ИСПРАВЛЕНО: В Telegram Mini App localStorage НЕ РАБОТАЕТ
      // Используем только authStore для надежности
      console.log('🔐 useAuth: Saving tokens to authStore only...', {
        access_token_length: data.access_token?.length || 0,
        refresh_token_length: data.refresh_token?.length || 0,
        is_telegram_mini_app: !!(window as any).Telegram?.WebApp
      })
      
      // ✅ ГЛАВНОЕ: Сохраняем ТОЛЬКО в authStore (это всегда работает)
      login(data.user, data.access_token)
      console.log('✅ useAuth: User logged in to authStore successfully')
      
      // Пытаемся сохранить в localStorage, но НЕ ЗАВИСИМ от этого
      try {
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('refresh_token', data.refresh_token)
        console.log('✅ useAuth: Tokens also saved to localStorage (fallback)')
      } catch (error) {
        console.warn('⚠️ useAuth: localStorage недоступен (это нормально для Telegram Mini App):', error)
      }
      
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      
      if (data.is_new_user) {
        toast.success('Добро пожаловать в MSK Flower! 🌸')
      } else {
        toast.success('С возвращением! 🌺')
      }
    },
    onError: (error: any) => {
      const message = error.message || 'Ошибка авторизации через Telegram'
      toast.error(message)
    },
  })

  // ✅ НОВОЕ: Telegram Website авторизация
  const telegramWebsiteMutation = useMutation({
    mutationFn: async (telegramData: any) => {
      const response = await fetch('/api/v1/auth/telegram-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(telegramData)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Ошибка авторизации')
      }
      
      return response.json()
    },
    onSuccess: (data) => {
      // Store tokens
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      
      // Update store
      login(data.user, data.access_token)
      
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      
      if (data.is_new_user) {
        toast.success('Добро пожаловать в MSK Flower! 🌸')
      } else {
        toast.success('Авторизация успешна! 🌺')
      }
    },
    onError: (error: any) => {
      const message = error.message || 'Ошибка авторизации через Telegram'
      toast.error(message)
    },
  })

  // Login mutation (обычная авторизация)
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginForm) => {
      const response = await apiClient.login(credentials)
      return response.data
    },
    onSuccess: (data) => {
      // Store tokens
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      
      // Update store
      login(data.user)
      
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      
      toast.success('Добро пожаловать!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Ошибка входа'
      toast.error(message)
    },
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterForm) => {
      const response = await apiClient.register(userData)
      return response.data
    },
    onSuccess: (data) => {
      // Store tokens
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      
      // Update store
      login(data.user)
      
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      
      toast.success('Регистрация успешна!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Ошибка регистрации'
      toast.error(message)
    },
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const response = await apiClient.updateProfile(userData)
      return response.data
    },
    onSuccess: (data) => {
      // Update store
      login(data)
      
      // Invalidate and refetch profile
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      
      toast.success('Профиль обновлен!')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Ошибка обновления профиля'
      toast.error(message)
    },
  })

  // Logout function
  const handleLogout = () => {
    logout()
    queryClient.clear()
    toast.success('Вы вышли из системы')
  }

  return {
    user: profile || user,
    isAuthenticated,
    isLoadingProfile,
    
    // ✅ НОВЫЕ УНИФИЦИРОВАННЫЕ МЕТОДЫ
    loginTelegramMiniApp: telegramMiniAppMutation.mutate,
    loginTelegramWebsite: telegramWebsiteMutation.mutate,
    
    // Существующие методы
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    logout: handleLogout,
    
    // Состояния загрузки
    isLoading: loginMutation.isPending || registerMutation.isPending || updateProfileMutation.isPending || telegramMiniAppMutation.isPending || telegramWebsiteMutation.isPending,
    isTelegramAuthLoading: telegramMiniAppMutation.isPending || telegramWebsiteMutation.isPending,
  }
} 