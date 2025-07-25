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

  // Login mutation
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
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    logout: handleLogout,
    isLoading: loginMutation.isPending || registerMutation.isPending || updateProfileMutation.isPending,
  }
} 