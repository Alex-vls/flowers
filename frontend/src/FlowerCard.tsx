import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Eye } from 'lucide-react'
import { Flower } from '@/types'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { Badge, Button, Tooltip } from '@/components/ui'

interface FlowerCardProps {
  flower: Flower
  onFavorite?: (flowerId: number) => void
  isFavorite?: boolean
}

export default function FlowerCard({ flower, onFavorite, isFavorite = false }: FlowerCardProps) {
  const { addToCart } = useCart()
  const [isHovered, setIsHovered] = useState(false)

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addToCart(flower, 1)
  }

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onFavorite?.(flower.id)
  }

  return (
    <div
      className="group relative bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={flower.image_url || '/placeholder-flower.jpg'}
          alt={flower.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Overlay with actions */}
        <div className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="flex space-x-2">
            <Tooltip content="Быстрый просмотр">
              <Button
                variant="ghost"
                size="sm"
                className="bg-white/90 hover:bg-white text-gray-700"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </Tooltip>
            
            <Tooltip content={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}>
              <Button
                variant="ghost"
                size="sm"
                className={`bg-white/90 hover:bg-white ${
                  isFavorite ? 'text-rose-600' : 'text-gray-700'
                }`}
                onClick={handleFavorite}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* Status badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {!flower.is_available && (
            <Badge color="danger" className="text-xs">
              Нет в наличии
            </Badge>
          )}
          {flower.is_seasonal && (
            <Badge color="accent" className="text-xs">
              Сезонный
            </Badge>
          )}
        </div>

        {/* View count */}
        <div className="absolute top-2 right-2">
          <Badge color="gray" className="text-xs">
            {flower.views_count} просмотров
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <Link to={`/flower/${flower.id}`} className="block">
          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">
            {flower.name}
          </h3>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {flower.description}
          </p>
        </Link>

        {/* Price and actions */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(flower.price)}
            </span>
            {flower.is_available && (
              <p className="text-xs text-gray-500">
                В наличии
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {flower.is_available ? (
              <Tooltip content="Добавить в корзину">
                <Button
                  size="sm"
                  onClick={handleAddToCart}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ShoppingCart className="w-4 h-4" />
                </Button>
              </Tooltip>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled
                className="text-gray-400"
              >
                Нет в наличии
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 