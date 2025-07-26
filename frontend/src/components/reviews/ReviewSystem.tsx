import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api'
import { Button, Input, Card, Badge, Modal, Alert } from '@/components/ui'
import { safeUserName, safeFirstChar, safeDate, safeArray } from '@/lib/safeUtils'
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  Camera, 
  Send, 
  Flag,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Review {
  id: number
  user_id: number
  flower_id: number
  rating: number
  comment: string
  photos?: string[]
  helpful_votes: number
  unhelpful_votes: number
  is_verified_purchase: boolean
  is_approved: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
  user: {
    full_name: string
    avatar?: string
  }
}

interface ReviewSystemProps {
  flowerId: number
  userCanReview?: boolean
  showAddReview?: boolean
  adminMode?: boolean
}

export default function ReviewSystem({ 
  flowerId, 
  userCanReview = true, 
  showAddReview = true,
  adminMode = false 
}: ReviewSystemProps) {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: '',
    photos: [] as string[]
  })
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful'>('newest')
  const [filterRating, setFilterRating] = useState<number | null>(null)

  // Fetch reviews
  const { data: reviews = [], isLoading, error } = useQuery({
    queryKey: ['flower-reviews', flowerId, sortBy, filterRating],
    queryFn: async () => {
      const params: any = { sort_by: sortBy }
      if (filterRating) params.rating = filterRating
      const response = await apiClient.getFlowerReviews(flowerId, params)
      return response.data || []
    },
  })

  // Add review mutation
  const addReviewMutation = useMutation({
    mutationFn: async (reviewData: typeof newReview) => {
      const response = await apiClient.addReview({
        flower_id: flowerId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        photos: reviewData.photos
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flower-reviews', flowerId] })
      setShowReviewModal(false)
      setNewReview({ rating: 5, comment: '', photos: [] })
      setSelectedPhotos([])
    }
  })

  // Vote on review mutation
  const voteReviewMutation = useMutation({
    mutationFn: async ({ reviewId, helpful }: { reviewId: number; helpful: boolean }) => {
      const response = await apiClient.voteReview(reviewId, helpful)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flower-reviews', flowerId] })
    }
  })

  // Delete review mutation (admin)
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      const response = await apiClient.deleteReview(reviewId)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flower-reviews', flowerId] })
    }
  })

  // Calculate average rating
  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum: number, review: Review) => sum + review.rating, 0) / reviews.length
    : 0

  // Rating distribution
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter((review: Review) => review.rating === rating).length,
    percentage: reviews.length > 0 
      ? (reviews.filter((review: Review) => review.rating === rating).length / reviews.length) * 100 
      : 0
  }))

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length + selectedPhotos.length > 5) {
      alert('Максимум 5 фотографий')
      return
    }
    setSelectedPhotos([...selectedPhotos, ...files])
  }

  const removePhoto = (index: number) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index))
  }

  const handleSubmitReview = () => {
    if (!newReview.comment.trim()) {
      alert('Добавьте комментарий к отзыву')
      return
    }
    
    // В реальном приложении здесь была бы загрузка фотографий
    addReviewMutation.mutate(newReview)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const sortOptions = [
    { value: 'newest', label: 'Сначала новые' },
    { value: 'oldest', label: 'Сначала старые' },
    { value: 'rating_high', label: 'Высокий рейтинг' },
    { value: 'rating_low', label: 'Низкий рейтинг' },
    { value: 'helpful', label: 'Полезные' },
  ]

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Отзывы ({reviews.length})
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        star <= Math.floor(averageRating)
                          ? 'text-yellow-400 fill-current'
                          : star - 0.5 <= averageRating
                          ? 'text-yellow-300 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {averageRating.toFixed(1)}
                </span>
              </div>
              <span className="text-gray-600">
                из {reviews.length} отзыв{reviews.length !== 1 ? (reviews.length < 5 ? 'ов' : 'ов') : 'а'}
              </span>
            </div>
          </div>

          {showAddReview && userCanReview && isAuthenticated && (
            <Button
              onClick={() => setShowReviewModal(true)}
              className="bg-pink-600 hover:bg-pink-700"
            >
              Написать отзыв
            </Button>
          )}
        </div>

        {/* Rating Distribution */}
        <div className="space-y-3">
          {ratingDistribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center space-x-3">
              <button
                onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                className={`flex items-center space-x-2 text-sm hover:text-pink-600 ${
                  filterRating === rating ? 'text-pink-600 font-medium' : 'text-gray-600'
                }`}
              >
                <span>{rating}</span>
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
              </button>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 w-8">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {filterRating && (
            <Badge 
              className="bg-pink-100 text-pink-800 cursor-pointer"
              onClick={() => setFilterRating(null)}
            >
              {filterRating} звезд ×
            </Badge>
          )}
        </div>

        <div className="text-sm text-gray-600">
          Показано: {reviews.length} отзывов
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review: Review) => (
            <Card key={review.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {safeFirstChar(review.user?.full_name)}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {safeUserName(review.user)}
                      </span>
                      {review.is_verified_purchase && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          ✓ Проверенная покупка
                        </Badge>
                      )}
                      {review.is_featured && (
                        <Badge className="bg-purple-100 text-purple-800 text-xs">
                          ⭐ Рекомендуемый
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Admin actions */}
                {adminMode && (
                  <div className="flex items-center space-x-2">
                    {!review.is_approved && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Одобрить
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteReviewMutation.mutate(review.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-gray-700 mb-4 leading-relaxed">
                {review.comment}
              </p>

              {/* Photo gallery */}
              {review.photos && review.photos.length > 0 && (
                <div className="flex space-x-2 mb-4 overflow-x-auto">
                  {review.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Фото отзыва ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-80"
                      onClick={() => {/* Open photo modal */}}
                    />
                  ))}
                </div>
              )}

              {/* Review actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => voteReviewMutation.mutate({ reviewId: review.id, helpful: true })}
                    className="flex items-center space-x-1 text-gray-600 hover:text-green-600"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm">{review.helpful_votes}</span>
                  </button>
                  <button
                    onClick={() => voteReviewMutation.mutate({ reviewId: review.id, helpful: false })}
                    className="flex items-center space-x-1 text-gray-600 hover:text-red-600"
                  >
                    <ThumbsDown className="w-4 h-4" />
                    <span className="text-sm">{review.unhelpful_votes}</span>
                  </button>
                </div>

                <button className="text-gray-400 hover:text-gray-600">
                  <Flag className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Star className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Пока нет отзывов
          </h3>
          <p className="text-gray-600 mb-4">
            Будьте первым, кто оставит отзыв об этом товаре
          </p>
          {showAddReview && userCanReview && isAuthenticated && (
            <Button
              onClick={() => setShowReviewModal(true)}
              className="bg-pink-600 hover:bg-pink-700"
            >
              Написать первый отзыв
            </Button>
          )}
        </div>
      )}

      {/* Add Review Modal */}
      <Modal
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Написать отзыв"
      >
        <div className="space-y-6">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Оценка
            </label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setNewReview({ ...newReview, rating: star })}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= newReview.rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ваш отзыв
            </label>
            <textarea
              value={newReview.comment}
              onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="Поделитесь своими впечатлениями о товаре..."
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Фотографии (до 5 шт.)
            </label>
            <div className="space-y-3">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
                id="review-photos"
              />
              <label
                htmlFor="review-photos"
                className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-pink-400 transition-colors"
              >
                <div className="text-center">
                  <Camera className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    Нажмите для добавления фотографий
                  </span>
                </div>
              </label>

              {selectedPhotos.length > 0 && (
                <div className="flex space-x-2 overflow-x-auto">
                  {selectedPhotos.map((photo, index) => (
                    <div key={index} className="relative flex-shrink-0">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex space-x-3 pt-4">
            <Button
              onClick={handleSubmitReview}
              disabled={!newReview.comment.trim() || addReviewMutation.isPending}
              className="flex-1 bg-pink-600 hover:bg-pink-700"
            >
              <Send className="w-4 h-4 mr-2" />
              {addReviewMutation.isPending ? 'Отправка...' : 'Опубликовать отзыв'}
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
    </div>
  )
} 