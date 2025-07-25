from fastapi import APIRouter, Response, HTTPException, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db
from app.models.flower import Flower
from typing import List
import json
from datetime import datetime

router = APIRouter()

@router.get("/sitemap.xml")
async def generate_sitemap(db: Session = Depends(get_db)):
    """Generate sitemap.xml with all flowers and static pages"""
    try:
        # Get all flowers
        flowers = db.query(Flower).filter(Flower.is_available == True).all()
        
        base_url = "https://flowerpunk.ru"
        current_date = datetime.now().strftime("%Y-%m-%d")
        
        # Static pages
        static_pages = [
            {
                "loc": f"{base_url}/",
                "lastmod": current_date,
                "changefreq": "daily",
                "priority": "1.0"
            },
            {
                "loc": f"{base_url}/catalog",
                "lastmod": current_date,
                "changefreq": "daily",
                "priority": "0.9"
            },
            {
                "loc": f"{base_url}/subscription",
                "lastmod": current_date,
                "changefreq": "weekly",
                "priority": "0.8"
            },
            {
                "loc": f"{base_url}/orders",
                "lastmod": current_date,
                "changefreq": "weekly",
                "priority": "0.7"
            },
            {
                "loc": f"{base_url}/profile",
                "lastmod": current_date,
                "changefreq": "monthly",
                "priority": "0.6"
            },
            {
                "loc": f"{base_url}/support",
                "lastmod": current_date,
                "changefreq": "monthly",
                "priority": "0.5"
            },
            {
                "loc": f"{base_url}/policy",
                "lastmod": current_date,
                "changefreq": "yearly",
                "priority": "0.3"
            }
        ]
        
        # Flower pages
        flower_pages = []
        for flower in flowers:
            lastmod = flower.updated_at.strftime("%Y-%m-%d") if flower.updated_at else current_date
            flower_pages.append({
                "loc": f"{base_url}/flowers/{flower.id}",
                "lastmod": lastmod,
                "changefreq": "weekly",
                "priority": "0.8"
            })
        
        # Generate XML
        xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
"""
        
        # Add static pages
        for page in static_pages:
            xml_content += f"""  <url>
    <loc>{page['loc']}</loc>
    <lastmod>{page['lastmod']}</lastmod>
    <changefreq>{page['changefreq']}</changefreq>
    <priority>{page['priority']}</priority>
  </url>
"""
        
        # Add flower pages
        for page in flower_pages:
            xml_content += f"""  <url>
    <loc>{page['loc']}</loc>
    <lastmod>{page['lastmod']}</lastmod>
    <changefreq>{page['changefreq']}</changefreq>
    <priority>{page['priority']}</priority>
  </url>
"""
        
        xml_content += "</urlset>"
        
        return Response(content=xml_content, media_type="application/xml")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating sitemap: {str(e)}")

@router.get("/robots.txt")
async def generate_robots_txt():
    """Generate robots.txt file"""
    base_url = "https://flowerpunk.ru"
    
    robots_content = f"""User-agent: *
Allow: /

# Sitemap
Sitemap: {base_url}/sitemap.xml

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
Crawl-delay: 1
"""
    
    return PlainTextResponse(content=robots_content)

@router.get("/structured-data/homepage")
async def get_homepage_structured_data():
    """Get structured data for homepage"""
    structured_data = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "FlowerPunk - Доставка цветов в Москве",
        "url": "https://flowerpunk.ru",
        "description": "Ежедневная доставка свежих цветов в Москве. Подписки на цветы, букеты, композиции.",
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://flowerpunk.ru/search?q={search_term_string}"
            },
            "query-input": "required name=search_term_string"
        },
        "publisher": {
            "@type": "Organization",
            "name": "FlowerPunk",
            "logo": {
                "@type": "ImageObject",
                "url": "https://flowerpunk.ru/logo.png"
            }
        }
    }
    
    return structured_data

@router.get("/structured-data/catalog")
async def get_catalog_structured_data(db: Session = Depends(get_db)):
    """Get structured data for catalog page"""
    flowers = db.query(Flower).filter(Flower.is_available == True).limit(10).all()
    
    item_list_element = []
    for i, flower in enumerate(flowers):
        item_list_element.append({
            "@type": "ListItem",
            "position": i + 1,
            "item": {
                "@type": "Product",
                "name": flower.name,
                "url": f"https://flowerpunk.ru/flowers/{flower.id}",
                "image": flower.image_url,
                "description": flower.description,
                "offers": {
                    "@type": "Offer",
                    "price": flower.price,
                    "priceCurrency": "RUB",
                    "availability": "https://schema.org/InStock" if flower.is_available else "https://schema.org/OutOfStock"
                }
            }
        })
    
    structured_data = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Каталог цветов FlowerPunk",
        "description": "Каталог свежих цветов с доставкой в Москве",
        "url": "https://flowerpunk.ru/catalog",
        "numberOfItems": len(flowers),
        "itemListElement": item_list_element
    }
    
    return structured_data

@router.get("/structured-data/flower/{flower_id}")
async def get_flower_structured_data(flower_id: int, db: Session = Depends(get_db)):
    """Get structured data for specific flower"""
    flower = db.query(Flower).filter(Flower.id == flower_id).first()
    
    if not flower:
        raise HTTPException(status_code=404, detail="Flower not found")
    
    # Get average rating from reviews (placeholder)
    avg_rating = 4.5  # TODO: Calculate from actual reviews
    
    structured_data = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": flower.name,
        "description": flower.description,
        "image": flower.image_url,
        "sku": f"FLOWER-{flower.id}",
        "category": flower.category.value,
        "brand": {
            "@type": "Brand",
            "name": "FlowerPunk"
        },
        "offers": {
            "@type": "Offer",
            "price": flower.price,
            "priceCurrency": "RUB",
            "availability": "https://schema.org/InStock" if flower.is_available else "https://schema.org/OutOfStock",
            "seller": {
                "@type": "Organization",
                "name": "FlowerPunk"
            },
            "url": f"https://flowerpunk.ru/flowers/{flower.id}"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": avg_rating,
            "reviewCount": flower.orders_count,
            "bestRating": 5,
            "worstRating": 1
        }
    }
    
    return structured_data 