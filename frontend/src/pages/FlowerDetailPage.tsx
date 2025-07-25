import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { Breadcrumbs } from '@/components/ui'
import SEO from '@/components/SEO'

export default function FlowerDetailPage() {
  const { id } = useParams()

  // Fetch flower details
  const { data: flower, isLoading, error } = useQuery({
    queryKey: ['flower', id],
    queryFn: async () => {
      const response = await apiClient.getFlower(Number(id))
      return response.data
    },
    enabled: !!id,
  })

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: 'Каталог', href: '/catalog' },
    { label: flower?.name || 'Цветок' },
  ]

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !flower) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <h1 className="text-2xl font-bold mb-4">Цветок не найден</h1>
        <div className="text-gray-500">К сожалению, запрашиваемый цветок не найден.</div>
      </div>
    )
  }

  return (
    <>
      <SEO 
        title={`${flower.name} - ${flower.price} ₽ | FlowerPunk`}
        description={flower.description || `Купить ${flower.name} с доставкой в Москве. Цена ${flower.price} ₽.`}
        image={flower.image_url}
        url={`https://flowerpunk.ru/flowers/${flower.id}`}
        schemaType="Product"
        schemaData={{
          name: flower.name,
          description: flower.description,
          image_url: flower.image_url,
          price: flower.price,
          is_available: flower.is_available,
          category: flower.category,
          rating: 4.5,
          review_count: 23
        }}
        breadcrumbs={[
          { name: 'Главная', url: 'https://flowerpunk.ru' },
          { name: 'Каталог', url: 'https://flowerpunk.ru/catalog' },
          { name: flower.name, url: `https://flowerpunk.ru/flowers/${flower.id}` }
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs items={breadcrumbItems} className="mb-6" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Flower Image */}
          <div>
            <img 
              src={flower.image_url} 
              alt={flower.name}
              className="w-full h-96 object-cover rounded-lg"
            />
          </div>

          {/* Flower Details */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{flower.name}</h1>
            <p className="text-gray-600 mb-6">{flower.description}</p>
            
            <div className="text-3xl font-bold text-green-600 mb-6">
              {flower.price} ₽
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center">
                <span className="text-gray-500 w-24">Категория:</span>
                <span className="font-medium">{flower.category}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500 w-24">Наличие:</span>
                <span className={`font-medium ${flower.is_available ? 'text-green-600' : 'text-red-600'}`}>
                  {flower.is_available ? 'В наличии' : 'Нет в наличии'}
                </span>
              </div>
              {flower.stock_quantity > 0 && (
                <div className="flex items-center">
                  <span className="text-gray-500 w-24">Остаток:</span>
                  <span className="font-medium">{flower.stock_quantity} шт.</span>
                </div>
              )}
            </div>

            <button className="btn-primary btn-lg w-full mb-4">
              Добавить в корзину
            </button>
            
            <button className="btn-secondary btn-lg w-full">
              Оформить подписку
            </button>
          </div>
        </div>
      </div>
    </>
  )
} 