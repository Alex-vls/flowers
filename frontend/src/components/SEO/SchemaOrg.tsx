import React from 'react';

interface SchemaOrgProps {
  type: 'Organization' | 'Product' | 'WebSite' | 'BreadcrumbList' | 'LocalBusiness' | 'Multiple';
  data: any;
  schemas?: Array<{ type: string; data: any }>; // Для множественных схем
}

const SchemaOrg: React.FC<SchemaOrgProps> = ({ type, data, schemas }) => {
  const generateSchema = (schemaType: string, schemaData: any) => {
    const baseSchema = {
      '@context': 'https://schema.org',
      '@type': schemaType,
    };

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
        };

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
        };

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
        };

      case 'BreadcrumbList':
        return {
          ...baseSchema,
          itemListElement: schemaData.items.map((item: any, index: number) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url
          }))
        };

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
        };

      default:
        return baseSchema;
    }
  };

  // Если передан массив схем, объединяем их в одну структуру
  if (type === 'Multiple' && schemas) {
    const multipleSchemas = schemas.map(schema => generateSchema(schema.type, schema.data));
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(multipleSchemas) }}
      />
    );
  }

  // Обычная одиночная схема
  const schema = generateSchema(type, data);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
};

export default SchemaOrg; 