import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { Button, Input, Select, Checkbox, Accordion } from '@/components/ui'
import { FLOWER_CATEGORIES, SORT_OPTIONS, SORT_ORDERS, PAGINATION_OPTIONS } from '@/constants'
import { FlowerFilter } from '@/types'

interface FlowerFiltersProps {
  filters: FlowerFilter
  onFiltersChange: (filters: FlowerFilter) => void
  onClearFilters: () => void
  totalResults: number
}

export default function FlowerFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  totalResults 
}: FlowerFiltersProps) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)

  const handleFilterChange = (key: keyof FlowerFilter, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== false
  )

  const filterItems = [
    {
      id: 'category',
      title: 'Категории',
      content: (
        <div className="space-y-2">
          {FLOWER_CATEGORIES.map((category) => (
            <Checkbox
              key={category.id}
              label={`${category.icon} ${category.name}`}
              checked={filters.category === category.id}
              onChange={(e) => handleFilterChange('category', e.target.checked ? category.id : undefined)}
            />
          ))}
        </div>
      ),
    },
    {
      id: 'price',
      title: 'Цена',
      content: (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Минимальная цена
            </label>
            <Input
              type="number"
              placeholder="0"
              value={filters.min_price || ''}
              onChange={(e) => handleFilterChange('min_price', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Максимальная цена
            </label>
            <Input
              type="number"
              placeholder="10000"
              value={filters.max_price || ''}
              onChange={(e) => handleFilterChange('max_price', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        </div>
      ),
    },
    {
      id: 'availability',
      title: 'Наличие',
      content: (
        <div className="space-y-2">
          <Checkbox
            label="Только в наличии"
            checked={filters.availability === true}
            onChange={(e) => handleFilterChange('availability', e.target.checked ? true : undefined)}
          />
          <Checkbox
            label="Сезонные цветы"
            checked={filters.seasonal === true}
            onChange={(e) => handleFilterChange('seasonal', e.target.checked ? true : undefined)}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Mobile filter button */}
      <div className="lg:hidden mb-4">
        <Button
          variant="outline"
          onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
          className="w-full justify-between"
        >
          <span className="flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Фильтры
          </span>
          {hasActiveFilters && (
            <Badge color="primary" className="ml-2">
              Активны
            </Badge>
          )}
        </Button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Поиск цветов..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Desktop filters */}
      <div className="hidden lg:block">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Фильтры</h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4 mr-1" />
              Очистить
            </Button>
          )}
        </div>

        <Accordion items={filterItems} allowMultiple />

        {/* Sort and pagination */}
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сортировка
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={filters.sort_by || 'name'}
                onChange={(e) => handleFilterChange('sort_by', e.target.value)}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </Select>
              <Select
                value={filters.sort_order || 'asc'}
                onChange={(e) => handleFilterChange('sort_order', e.target.value)}
              >
                {SORT_ORDERS.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Найдено: {totalResults} цветов
          </p>
        </div>
      </div>

      {/* Mobile filters */}
      {isMobileFiltersOpen && (
        <div className="lg:hidden">
          <div className="border-t border-gray-200 pt-4">
            <Accordion items={filterItems} allowMultiple />
            
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={onClearFilters}
                className="w-full mt-4"
              >
                <X className="w-4 h-4 mr-2" />
                Очистить все фильтры
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 