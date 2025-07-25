import { Flower } from '@/types'
import FlowerCard from './FlowerCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface FlowerGridProps {
  flowers: Flower[]
  isLoading?: boolean
  onFavorite?: (flowerId: number) => void
  favorites?: number[]
}

export default function FlowerGrid({ 
  flowers, 
  isLoading = false, 
  onFavorite, 
  favorites = [] 
}: FlowerGridProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (flowers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Цветы не найдены</h3>
        <p className="text-gray-500">Попробуйте изменить параметры поиска или фильтры</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {flowers.map((flower) => (
        <FlowerCard
          key={flower.id}
          flower={flower}
          onFavorite={onFavorite}
          isFavorite={favorites.includes(flower.id)}
        />
      ))}
    </div>
  )
} 