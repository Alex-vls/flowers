import { apiClient } from '@/lib/api'

export interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export interface SitemapData {
  urls: SitemapUrl[]
  flowers: any[]
}

export async function generateSitemap(): Promise<string> {
  try {
    // Fetch all flowers for sitemap
    const flowersResponse = await apiClient.getFlowers({ per_page: 1000 })
    const flowers = flowersResponse.data?.items || []

    const baseUrl = 'https://flowerpunk.ru'
    const currentDate = new Date().toISOString().split('T')[0]

    // Static pages
    const staticPages: SitemapUrl[] = [
      {
        loc: `${baseUrl}/`,
        lastmod: currentDate,
        changefreq: 'daily',
        priority: 1.0
      },
      {
        loc: `${baseUrl}/catalog`,
        lastmod: currentDate,
        changefreq: 'daily',
        priority: 0.9
      },
      {
        loc: `${baseUrl}/subscription`,
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 0.8
      },
      {
        loc: `${baseUrl}/orders`,
        lastmod: currentDate,
        changefreq: 'weekly',
        priority: 0.7
      },
      {
        loc: `${baseUrl}/profile`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.6
      },
      {
        loc: `${baseUrl}/support`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: 0.5
      },
      {
        loc: `${baseUrl}/policy`,
        lastmod: currentDate,
        changefreq: 'yearly',
        priority: 0.3
      }
    ]

    // Flower detail pages
    const flowerPages: SitemapUrl[] = flowers.map(flower => ({
      loc: `${baseUrl}/flowers/${flower.id}`,
      lastmod: flower.updated_at ? new Date(flower.updated_at).toISOString().split('T')[0] : currentDate,
      changefreq: 'weekly',
      priority: 0.8
    }))

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${[...staticPages, ...flowerPages].map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`

    return xml
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return generateBasicSitemap()
  }
}

function generateBasicSitemap(): string {
  const baseUrl = 'https://flowerpunk.ru'
  const currentDate = new Date().toISOString().split('T')[0]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/catalog</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/subscription</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`
}

// Generate robots.txt content
export function generateRobotsTxt(): string {
  const baseUrl = 'https://flowerpunk.ru'
  
  return `User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin and API routes
Disallow: /admin/
Disallow: /api/
Disallow: /_next/
Disallow: /static/

# Allow important pages
Allow: /catalog
Allow: /flowers/
Allow: /subscription
Allow: /orders
Allow: /profile
Allow: /support
Allow: /policy

# Crawl delay for respectful crawling
Crawl-delay: 1`
}

// Generate structured data for homepage
export function generateHomepageStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FlowerPunk - Доставка цветов в Москве',
    url: 'https://flowerpunk.ru',
    description: 'Ежедневная доставка свежих цветов в Москве. Подписки на цветы, букеты, композиции.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://flowerpunk.ru/search?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      name: 'FlowerPunk',
      logo: {
        '@type': 'ImageObject',
        url: 'https://flowerpunk.ru/logo.png'
      }
    }
  }
}

// Generate structured data for catalog page
export function generateCatalogStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Каталог цветов FlowerPunk',
    description: 'Каталог свежих цветов с доставкой в Москве',
    url: 'https://flowerpunk.ru/catalog',
    numberOfItems: 0, // Will be updated dynamically
    itemListElement: [] // Will be populated with flower data
  }
}

// Generate structured data for individual flower
export function generateFlowerStructuredData(flower: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: flower.name,
    description: flower.description,
    image: flower.image_url,
    sku: `FLOWER-${flower.id}`,
    category: flower.category,
    brand: {
      '@type': 'Brand',
      name: 'FlowerPunk'
    },
    offers: {
      '@type': 'Offer',
      price: flower.price,
      priceCurrency: 'RUB',
      availability: flower.is_available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'FlowerPunk'
      },
      url: `https://flowerpunk.ru/flowers/${flower.id}`
    },
    aggregateRating: flower.rating ? {
      '@type': 'AggregateRating',
      ratingValue: flower.rating,
      reviewCount: flower.review_count || 0,
      bestRating: 5,
      worstRating: 1
    } : undefined
  }
} 