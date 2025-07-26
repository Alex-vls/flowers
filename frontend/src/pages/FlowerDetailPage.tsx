import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { Breadcrumbs, Button, Badge, Alert, Modal } from '@/components/ui'
import { useCart } from '@/hooks/useCart'
import { useAuth } from '@/hooks/useAuth'
import { ReviewSystem } from '@/components/reviews'
import SEO from '@/components/SEO'
import { 
  Heart, 
  ShoppingCart, 
  Star, 
  Plus, 
  Minus, 
  Share2, 
  Calendar,
  Truck,
  Shield,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

export default function FlowerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  
  const [quantity, setQuantity] = useState(1)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewText, setReviewText] = useState('')

  // Fetch flower details
  const { data: flower, isLoading, error } = useQuery({
    queryKey: ['flower', id],
    queryFn: async () => {
      const response = await apiClient.getFlower(Number(id))
      return response.data
    },
    enabled: !!id,
  })

  // Add review mutation
  const addReviewMutation = useMutation({
    mutationFn: async (reviewData: { rating: number; content: string }) => {
      const response = await apiClient.addReview({
        flower_id: Number(id),
        rating: reviewData.rating,
        comment: reviewData.content
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flower', id] })
      setShowReviewModal(false)
      setReviewText('')
      setReviewRating(5)
    },
  })

  const handleAddReview = () => {
    if (!reviewText.trim()) return
    addReviewMutation.mutate({
      rating: reviewRating,
      content: reviewText.trim()
    })
  }



  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !flower) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>
        <Alert type="error">
          <h1 className="text-xl font-bold mb-2">Цветок не найден</h1>
          <p>К сожалению, запрашиваемый цветок не найден.</p>
        </Alert>
      </div>
    )
  }

  // Mock images for gallery (in real app would come from API)
  const images = [
    flower.image_url || '/placeholder-flower.jpg',
    flower.image_url || '/placeholder-flower.jpg',
    flower.image_url || '/placeholder-flower.jpg'
  ]

  // Mock rating for display
  const averageRating = 4.2 + Math.random() * 0.8

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Каталог', href: '/catalog' },
    { label: flower.name },
  ]

  const handleAddToCart = () => {
    addToCart(flower, quantity)
  }

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta
    if (newQuantity >= 1 && newQuantity <= (flower.max_order_quantity || 100)) {
      setQuantity(newQuantity)
    }
  }



  return (
    <>
      <SEO 
        title={`${flower.name} - ${flower.price} ₽ | MSK Flower`}
        description={flower.description || `Купить ${flower.name} с доставкой в Москве. Цена ${flower.price} ₽.`}
        keywords={`${flower.name}, цветы, доставка, ${flower.category}`}
        ogImage={flower.image_url}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} className="mb-6" />

        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к каталогу
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img
                src={images[selectedImageIndex]}
                alt={flower.name}
                className="w-full h-full object-cover"
              />
              
              {/* Image Navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImageIndex(prev => 
                      prev > 0 ? prev - 1 : images.length - 1
                    )}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImageIndex(prev => 
                      prev < images.length - 1 ? prev + 1 : 0
                    )}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 space-y-2">
                {!flower.is_available && (
                  <Badge color="danger">Нет в наличии</Badge>
                )}
                {flower.is_seasonal && (
                  <Badge color="accent">Сезонный</Badge>
                )}
              </div>
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex space-x-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      selectedImageIndex === index 
                        ? 'border-pink-500' 
                        : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${flower.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{flower.name}</h1>
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`p-2 rounded-full transition-colors ${
                    isFavorite 
                      ? 'bg-pink-100 text-pink-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>

              <p className="text-gray-600 text-lg capitalize mb-4">{flower.category}</p>

              {/* Rating and Reviews */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.floor(averageRating)
                          ? 'text-yellow-400 fill-current'
                          : star - 0.5 <= averageRating
                          ? 'text-yellow-300 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                                     <span className="text-gray-600 ml-2">
                     {averageRating.toFixed(1)} (23 отзыва)
                   </span>
                </div>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">{flower.views_count} просмотров</span>
              </div>
            </div>

            {/* Price */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="text-3xl font-bold text-pink-600 mb-2">
                {flower.price} ₽
              </div>
              <p className="text-gray-600">за букет</p>
            </div>

            {/* Description */}
            {flower.description && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Описание</h3>
                <p className="text-gray-700 leading-relaxed">{flower.description}</p>
              </div>
            )}

            {/* Quantity Selector */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Количество</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="p-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-3 font-semibold">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= (flower.max_order_quantity || 100)}
                    className="p-3 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-gray-500">
                  {flower.min_order_quantity && (
                    <span>Мин: {flower.min_order_quantity} шт. </span>
                  )}
                  {flower.max_order_quantity && (
                    <span>Макс: {flower.max_order_quantity} шт.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                disabled={!flower.is_available}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white py-4 text-lg font-semibold"
                size="lg"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {flower.is_available ? `Добавить в корзину (${(flower.price * quantity)} ₽)` : 'Нет в наличии'}
              </Button>
              
              <div className="flex space-x-2">
                <Button variant="outline" className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  Поделиться
                </Button>
                <Button variant="outline" className="flex-1">
                  <Calendar className="w-4 h-4 mr-2" />
                  В подписку
                </Button>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="bg-green-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center text-green-700">
                <Truck className="w-5 h-5 mr-2" />
                <span className="font-medium">Доставка по Москве</span>
              </div>
              <p className="text-green-600 text-sm">Бесплатная доставка при заказе от 1000 ₽</p>
              <div className="flex items-center text-green-700">
                <Shield className="w-5 h-5 mr-2" />
                <span className="font-medium">Гарантия свежести</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16">
          <ReviewSystem 
            flowerId={Number(id)} 
            userCanReview={true}
            showAddReview={true}
            adminMode={false}
          />
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Написать отзыв"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Рейтинг
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= reviewRating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Комментарий
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="Поделитесь своим мнением о товаре..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleAddReview}
              disabled={!reviewText.trim() || addReviewMutation.isPending}
              className="flex-1"
            >
              {addReviewMutation.isPending ? 'Отправка...' : 'Отправить отзыв'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowReviewModal(false)}
              className="flex-1"
            >
              Отмена
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
} 