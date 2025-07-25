import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { FlowerFilter } from '@/types'
import { Breadcrumbs } from '@/components/ui'
import FlowerGrid from '@/components/catalog/FlowerGrid'
import FlowerFilters from '@/components/catalog/FlowerFilters'
import Pagination from '@/components/ui/Pagination'
import SEO from '@/components/SEO'

export default function CatalogPage() {
  const [filters, setFilters] = useState<FlowerFilter>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(12)

  // Fetch flowers with filters
  const { data: flowersData, isLoading, error } = useQuery({
    queryKey: ['flowers', filters, currentPage, perPage],
    queryFn: async () => {
      const params = {
        ...filters,
        page: currentPage,
        per_page: perPage,
      }
      const response = await apiClient.getFlowers(params)
      return response.data
    },
    keepPreviousData: true,
  })

  const flowers = flowersData?.items || []
  const totalFlowers = flowersData?.total || 0
  const totalPages = flowersData?.pages || 1

  // Handle filter changes
  const handleFiltersChange = (newFilters: FlowerFilter) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({})
    setCurrentPage(1)
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle favorites (placeholder for now)
  const handleFavorite = (flowerId: number) => {
    console.log('Toggle favorite for flower:', flowerId)
    // TODO: Implement favorites functionality
  }

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Каталог' },
  ]

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Ошибка загрузки каталога</h1>
          <p className="text-gray-600">Попробуйте обновить страницу или обратитесь в поддержку</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <SEO 
        title="Каталог цветов - FlowerPunk | Доставка цветов в Москве"
        description="Каталог свежих цветов с доставкой в Москве. Розы, тюльпаны, лилии, орхидеи и другие цветы. Ежедневная доставка, подписки на цветы."
        image="https://flowerpunk.ru/catalog-og.jpg"
        url="https://flowerpunk.ru/catalog"
        schemaType="LocalBusiness"
        schemaData={{
          name: 'FlowerPunk - Каталог цветов',
          description: 'Каталог свежих цветов с доставкой в Москве',
          url: 'https://flowerpunk.ru/catalog'
        }}
        breadcrumbs={[
          { name: 'Главная', url: 'https://flowerpunk.ru' },
          { name: 'Каталог', url: 'https://flowerpunk.ru/catalog' }
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} className="mb-6" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Каталог цветов</h1>
        <p className="text-gray-600">
          Выберите идеальные цветы для вашего стола. Ежедневная доставка свежих букетов в Москве.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <FlowerFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            totalResults={totalFlowers}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Results header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Найдено {totalFlowers} цветов
              </h2>
              {Object.keys(filters).length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Применены фильтры
                </p>
              )}
            </div>

            {/* Sort options for mobile */}
            <div className="lg:hidden">
              <select
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={`${filters.sort_by || 'name'}-${filters.sort_order || 'asc'}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-')
                  handleFiltersChange({
                    ...filters,
                    sort_by: sortBy,
                    sort_order: sortOrder,
                  })
                }}
              >
                <option value="name-asc">По названию (А-Я)</option>
                <option value="name-desc">По названию (Я-А)</option>
                <option value="price-asc">По цене (дешевле)</option>
                <option value="price-desc">По цене (дороже)</option>
                <option value="created_at-desc">Сначала новые</option>
                <option value="view_count-desc">По популярности</option>
              </select>
            </div>
          </div>

          {/* Flowers Grid */}
          <FlowerGrid
            flowers={flowers}
            isLoading={isLoading}
            onFavorite={handleFavorite}
            favorites={[]} // TODO: Get from store
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
} 