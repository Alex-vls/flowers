import { Helmet } from 'react-helmet-async'
import { useEffect } from 'react'

interface SEOProps {
  title?: string
  description?: string
  image?: string
  url?: string
  schemaType?: 'Organization' | 'Product' | 'WebSite' | 'BreadcrumbList' | 'LocalBusiness'
  schemaData?: any
  breadcrumbs?: Array<{ name: string; url: string }>
}

export default function SEO({ 
  title, 
  description, 
  image, 
  url, 
  schemaType, 
  schemaData,
  breadcrumbs 
}: SEOProps) {
  
  // Добавляем Schema.org через DOM манипуляции
  useEffect(() => {
    // Удаляем старые schema теги
    const oldSchemas = document.querySelectorAll('script[data-schema-org]')
    oldSchemas.forEach(script => script.remove())
    
    const schemas: any[] = []
    
    // Добавляем основную схему
    if (schemaType && schemaData) {
      schemas.push(generateSchema(schemaType, schemaData))
    }
    
    // Добавляем Organization schema для WebSite (главная страница)
    if (schemaType === 'WebSite') {
      schemas.push(generateSchema('Organization', {
        name: 'FlowerPunk',
        url: 'https://flowerpunk.ru',
        description: 'Доставка свежих цветов в Москве. Подписки на цветы, букеты, композиции.'
      }))
    }
    
    // Добавляем breadcrumbs схему
    if (breadcrumbs && breadcrumbs.length > 0) {
      schemas.push(generateSchema('BreadcrumbList', { items: breadcrumbs }))
    }
    
    // Создаём script тег для каждой схемы
    schemas.forEach((schema, index) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.setAttribute('data-schema-org', `schema-${index}`)
      script.textContent = JSON.stringify(schema)
      document.head.appendChild(script)
    })
    
    // Cleanup при размонтировании
    return () => {
      const schemaScripts = document.querySelectorAll('script[data-schema-org]')
      schemaScripts.forEach(script => script.remove())
    }
  }, [schemaType, schemaData, breadcrumbs])
  
  return (
    <Helmet>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {image && <meta property="og:image" content={image} />}
      {url && <meta property="og:url" content={url} />}
      
      {/* Open Graph tags */}
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="FlowerPunk" />
      
      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  )
}

// Функция генерации схем (вынесена из SchemaOrg)
function generateSchema(schemaType: string, schemaData: any) {
  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': schemaType,
  }

  switch (schemaType) {
    case 'Organization':
      return {
        ...baseSchema,
        name: schemaData.name || 'FlowerPunk',
        url: schemaData.url || 'https://flowerpunk.ru',
        logo: schemaData.logo || 'https://flowerpunk.ru/logo.png',
        description: schemaData.description || 'Доставка свежих цветов в Москве. Подписки на цветы, букеты, композиции.',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Москва',
          addressCountry: 'RU',
          addressRegion: 'Москва'
        },
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+7-999-123-45-67',
          contactType: 'customer service',
          availableLanguage: ['Russian', 'English']
        },
        sameAs: [
          'https://t.me/flowerpunk_bot',
          'https://instagram.com/flowerpunk'
        ]
      }

    case 'Product':
      return {
        ...baseSchema,
        name: schemaData.name,
        description: schemaData.description,
        image: schemaData.image_url,
        offers: {
          '@type': 'Offer',
          price: schemaData.price,
          priceCurrency: 'RUB',
          availability: schemaData.is_available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: 'FlowerPunk'
          }
        },
        category: schemaData.category,
        brand: {
          '@type': 'Brand',
          name: 'FlowerPunk'
        },
        aggregateRating: schemaData.rating ? {
          '@type': 'AggregateRating',
          ratingValue: schemaData.rating,
          reviewCount: schemaData.review_count || 0
        } : undefined
      }

    case 'WebSite':
      return {
        ...baseSchema,
        name: 'FlowerPunk - Доставка цветов',
        url: 'https://flowerpunk.ru',
        description: 'Доставка свежих цветов в Москве. Подписки на цветы, букеты, композиции.',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://flowerpunk.ru/search?q={search_term_string}'
          },
          'query-input': 'required name=search_term_string'
        }
      }

    case 'BreadcrumbList':
      return {
        ...baseSchema,
        itemListElement: schemaData.items.map((item: any, index: number) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url
        }))
      }

    case 'LocalBusiness':
      return {
        ...baseSchema,
        name: 'FlowerPunk',
        description: 'Доставка свежих цветов в Москве',
        url: 'https://flowerpunk.ru',
        telephone: '+7-999-123-45-67',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Москва',
          addressCountry: 'RU',
          addressRegion: 'Москва'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 55.7558,
          longitude: 37.6176
        },
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            opens: '09:00',
            closes: '21:00'
          }
        ],
        priceRange: '$$',
        servesCuisine: 'Flower Delivery',
        hasMenu: 'https://flowerpunk.ru/catalog'
      }

    default:
      return baseSchema
  }
} 