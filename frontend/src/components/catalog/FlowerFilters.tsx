import { useState } from 'react'
import { Search, Filter, X, Star, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { Button, Input, Select, Checkbox, Badge } from '@/components/ui'
import { FLOWER_CATEGORIES, SORT_OPTIONS, SORT_ORDERS } from '@/constants'
import { FlowerFilter } from '@/types'

interface FlowerFiltersProps {
  filters: FlowerFilter
  onFiltersChange: (filters: FlowerFilter) => void
  onClearFilters: () => void
  totalResults: number
}

// Price ranges for quick selection
const PRICE_RANGES = [
  { id: 'budget', label: 'До 1000₽', min: 0, max: 1000 },
  { id: 'medium', label: '1000-2000₽', min: 1000, max: 2000 },
  { id: 'premium', label: '2000-5000₽', min: 2000, max: 5000 },
  { id: 'luxury', label: 'От 5000₽', min: 5000, max: null },
]

// Rating filters
const RATING_FILTERS = [
  { id: 5, label: '5 звезд', stars: 5 },
  { id: 4, label: '4 звезды и выше', stars: 4 },
  { id: 3, label: '3 звезды и выше', stars: 3 },
]

export default function FlowerFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  totalResults 
}: FlowerFiltersProps) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('')

  const handleFilterChange = (key: keyof FlowerFilter, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const handlePriceRangeChange = (range: typeof PRICE_RANGES[0]) => {
    onFiltersChange({
      ...filters,
      min_price: range.min,
      max_price: range.max,
    })
  }

  const handleSortChange = (value: string) => {
    const [sort_by, sort_order] = value.split('-')
    onFiltersChange({
      ...filters,
      sort_by: sort_by as any,
      sort_order: sort_order as any,
    })
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'search' && value) return true
    return value !== undefined && value !== '' && value !== false
  })

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => 
      value !== undefined && value !== '' && value !== false
    ).length
  }

  const getCurrentSort = () => {
    return `${filters.sort_by || 'name'}-${filters.sort_order || 'asc'}`
  }

  const toggleMobileFilters = () => {
    setIsMobileFiltersOpen(!isMobileFiltersOpen)
  }

  const FilterSection = ({ id, title, children }: { id: string, title: string, children: React.ReactNode }) => (
    <div className="border-b border-gray-200 pb-4">
      <button
        onClick={() => setActiveSection(activeSection === id ? '' : id)}
        className="flex items-center justify-between w-full py-2 text-left font-medium text-gray-900 hover:text-gray-700"
      >
        <span>{title}</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform ${
            activeSection === id ? 'rotate-180' : ''
          }`} 
        />
      </button>
      {activeSection === id && (
        <div className="mt-3 space-y-2">
          {children}
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between mb-4">
          <Button
            onClick={toggleMobileFilters}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Фильтры</span>
            {getActiveFiltersCount() > 0 && (
              <Badge className="bg-pink-500 text-white">
                {getActiveFiltersCount()}
              </Badge>
            )}
          </Button>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{totalResults} товаров</span>
            <Select
              value={getCurrentSort()}
              onChange={handleSortChange}
              options={SORT_OPTIONS.flatMap(option => 
                SORT_ORDERS.map(order => ({
                  value: `${option.id}-${order.id}`,
                  label: `${option.name} (${order.name})`
                }))
              )}
              className="min-w-[200px]"
            />
          </div>
        </div>
      </div>

      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Фильтры
            </h3>
            {hasActiveFilters && (
              <Button
                onClick={onClearFilters}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4 mr-1" />
                Очистить
              </Button>
            )}
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Поиск
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Найти цветы..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Quick Price Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Быстрый выбор цены
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRICE_RANGES.map((range) => (
                <Button
                  key={range.id}
                  onClick={() => handlePriceRangeChange(range)}
                  variant={
                    filters.min_price === range.min && filters.max_price === range.max
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="text-xs"
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Диапазон цен
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  type="number"
                  placeholder="От"
                  value={filters.min_price || ''}
                  onChange={(e) => handleFilterChange('min_price', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="До"
                  value={filters.max_price || ''}
                  onChange={(e) => handleFilterChange('max_price', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Категории
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {FLOWER_CATEGORIES.map((category) => (
                <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.category === category.id}
                    onChange={(e) => handleFilterChange('category', e.target.checked ? category.id : undefined)}
                    className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  <span className="text-sm text-gray-700">
                    {category.icon} {category.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Рейтинг
            </label>
            <div className="space-y-2">
              {RATING_FILTERS.map((rating) => (
                <label key={rating.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="rating"
                    value={rating.id}
                    checked={filters.min_rating === rating.stars}
                    onChange={(e) => handleFilterChange('min_rating', e.target.checked ? rating.stars : undefined)}
                    className="text-pink-600 focus:ring-pink-500"
                  />
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < rating.stars ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-sm text-gray-700 ml-1">{rating.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Наличие
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.is_available === true}
                  onChange={(e) => handleFilterChange('is_available', e.target.checked ? true : undefined)}
                  className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <span className="text-sm text-gray-700">Только в наличии</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.is_seasonal === true}
                  onChange={(e) => handleFilterChange('is_seasonal', e.target.checked ? true : undefined)}
                  className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <span className="text-sm text-gray-700">Сезонные цветы</span>
              </label>
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Сортировка
            </label>
            <Select
              value={getCurrentSort()}
              onChange={handleSortChange}
              options={SORT_OPTIONS.flatMap(option => 
                SORT_ORDERS.map(order => ({
                  value: `${option.id}-${order.id}`,
                  label: `${option.name} (${order.name})`
                }))
              )}
            />
          </div>

          {/* Results Count */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Найдено: <span className="font-medium">{totalResults}</span> товаров
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {isMobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50">
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">Фильтры</h3>
                <Button
                  onClick={toggleMobileFilters}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Search */}
                <FilterSection id="search" title="Поиск">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      type="text"
                      placeholder="Найти цветы..."
                      value={filters.search || ''}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </FilterSection>

                {/* Price */}
                <FilterSection id="price" title="Цена">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2">
                      {PRICE_RANGES.map((range) => (
                        <Button
                          key={range.id}
                          onClick={() => handlePriceRangeChange(range)}
                          variant={
                            filters.min_price === range.min && filters.max_price === range.max
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                        >
                          {range.label}
                        </Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="От"
                        value={filters.min_price || ''}
                        onChange={(e) => handleFilterChange('min_price', e.target.value ? Number(e.target.value) : undefined)}
                      />
                      <Input
                        type="number"
                        placeholder="До"
                        value={filters.max_price || ''}
                        onChange={(e) => handleFilterChange('max_price', e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </div>
                  </div>
                </FilterSection>

                {/* Categories */}
                <FilterSection id="categories" title="Категории">
                  <div className="space-y-2">
                    {FLOWER_CATEGORIES.map((category) => (
                      <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.category === category.id}
                          onChange={(e) => handleFilterChange('category', e.target.checked ? category.id : undefined)}
                          className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                        <span className="text-sm text-gray-700">
                          {category.icon} {category.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </FilterSection>

                {/* Other filters */}
                <FilterSection id="other" title="Дополнительно">
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.is_available === true}
                        onChange={(e) => handleFilterChange('is_available', e.target.checked ? true : undefined)}
                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      />
                      <span className="text-sm text-gray-700">Только в наличии</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.is_seasonal === true}
                        onChange={(e) => handleFilterChange('is_seasonal', e.target.checked ? true : undefined)}
                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      />
                      <span className="text-sm text-gray-700">Сезонные цветы</span>
                    </label>
                  </div>
                </FilterSection>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 space-y-3">
                {hasActiveFilters && (
                  <Button
                    onClick={onClearFilters}
                    variant="outline"
                    className="w-full"
                  >
                    Очистить фильтры
                  </Button>
                )}
                <Button
                  onClick={toggleMobileFilters}
                  className="w-full bg-pink-600 hover:bg-pink-700"
                >
                  Показать {totalResults} товаров
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 