import { Flower, Truck, Clock, Heart } from 'lucide-react'
import SEO from '../components/SEO'

export default function HomePage() {
  return (
    <>
      <SEO 
        title="FlowerPunk - Доставка цветов в Москве | Подписки на цветы"
        description="Ежедневная доставка свежих цветов в Москве. Подписки на цветы, букеты, композиции. Свежие цветы каждый день прямо к вашему столу."
        image="https://flowerpunk.ru/og-image.jpg"
        url="https://flowerpunk.ru"
        schemaType="WebSite"
        schemaData={{
          name: 'FlowerPunk - Доставка цветов',
          url: 'https://flowerpunk.ru',
          description: 'Ежедневная доставка свежих цветов в Москве. Подписки на цветы, букеты, композиции.'
        }}
        breadcrumbs={[
          { name: 'Главная', url: 'https://flowerpunk.ru' }
        ]}
      />
      
      <div className="max-w-6xl mx-auto py-16 px-4">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center">
            <Flower className="w-10 h-10 text-white" />
          </div>
        </div>
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-green-600 to-pink-600 bg-clip-text text-transparent">
          MSK Flower - Ежедневная доставка цветов
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Ежедневная доставка свежих цветов в Москве. Подпишись — и цветы всегда на твоём столе!
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <a href="/catalog" className="btn-primary btn-lg">Каталог цветов</a>
          <a href="/subscription" className="btn-secondary btn-lg">Оформить подписку</a>
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Ежедневная доставка</h3>
          <p className="text-gray-600">Свежие цветы каждый день прямо к вашему столу</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-pink-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Удобные слоты</h3>
          <p className="text-gray-600">Выбирайте время доставки: утро, день или вечер</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-rose-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Персональный подход</h3>
          <p className="text-gray-600">Индивидуальные букеты под ваши предпочтения</p>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-green-50 to-pink-50 rounded-2xl p-8 text-center border border-green-200">
        <h2 className="text-3xl font-bold mb-4 text-gray-800">Готовы начать?</h2>
        <p className="text-gray-600 mb-6">Присоединяйтесь к тысячам довольных клиентов</p>
        <a href="/subscription" className="btn-primary btn-lg">Начать подписку</a>
      </div>
    </div>
    </>
  )
} 