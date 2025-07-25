import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { OrderFilter } from '@/types'
import { Breadcrumbs, Tabs, Alert } from '@/components/ui'
import OrderCard from '@/components/orders/OrderCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Pagination from '@/components/ui/Pagination'
import toast from 'react-hot-toast'

export default function OrdersPage() {
  const [filters, setFilters] = useState<OrderFilter>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState('all')
  const queryClient = useQueryClient()

  // Fetch orders
  const { data: ordersData, isLoading, error } = useQuery({
    queryKey: ['orders', filters, currentPage, activeTab],
    queryFn: async () => {
      const params = {
        ...filters,
        page: currentPage,
        per_page: 10,
        status: activeTab === 'all' ? undefined : activeTab,
      }
      const response = await apiClient.getOrders(params)
      return response.data
    },
    keepPreviousData: true,
  })

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiClient.cancelOrder(orderId)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Заказ отменен')
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Ошибка отмены заказа'
      toast.error(message)
    },
  })

  const orders = ordersData?.items || []
  const totalOrders = ordersData?.total || 0
  const totalPages = ordersData?.pages || 1

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setCurrentPage(1)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle order cancellation
  const handleCancelOrder = (orderId: number) => {
    if (confirm('Вы уверены, что хотите отменить этот заказ?')) {
      cancelOrderMutation.mutate(orderId)
    }
  }

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Заказы' },
  ]

  const tabs = [
    { id: 'all', label: 'Все заказы' },
    { id: 'pending', label: 'Ожидают подтверждения' },
    { id: 'confirmed', label: 'Подтверждены' },
    { id: 'preparing', label: 'Готовятся' },
    { id: 'delivering', label: 'Доставляются' },
    { id: 'delivered', label: 'Доставлены' },
    { id: 'cancelled', label: 'Отменены' },
  ]

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Alert type="error" title="Ошибка загрузки заказов">
          Попробуйте обновить страницу или обратитесь в поддержку
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} className="mb-6" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Мои заказы</h1>
        <p className="text-gray-600">
          История всех ваших заказов и подписок на цветы
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs
          tabs={tabs}
          defaultTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Content */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Заказы не найдены</h3>
            <p className="text-gray-500 mb-4">
              {activeTab === 'all' 
                ? 'У вас пока нет заказов. Перейдите в каталог, чтобы сделать первый заказ!'
                : `У вас нет заказов со статусом "${tabs.find(t => t.id === activeTab)?.label}"`
              }
            </p>
            {activeTab === 'all' && (
              <a href="/catalog" className="btn-primary">
                Перейти в каталог
              </a>
            )}
          </div>
        ) : (
          <>
            {/* Orders list */}
            <div className="space-y-4">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onCancel={handleCancelOrder}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </div>
            )}

            {/* Results count */}
            <div className="text-center text-sm text-gray-500">
              Показано {orders.length} из {totalOrders} заказов
            </div>
          </>
        )}
      </div>
    </div>
  )
} 