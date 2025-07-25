from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="MSK Flower API",
    version="1.0.0",
    description="API для сервиса доставки цветов MSK Flower"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "MSK Flower API работает!"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "MSK Flower API"}

@app.get("/api/v1/flowers")
async def get_flowers():
    """Тестовый эндпоинт для цветов"""
    return {
        "items": [
            {
                "id": 1,
                "name": "Красные розы",
                "description": "Красивые красные розы",
                "price": 1500.0,
                "category": "roses",
                "image_url": "https://example.com/red-roses.jpg",
                "is_available": True
            },
            {
                "id": 2,
                "name": "Тюльпаны",
                "description": "Весенние тюльпаны",
                "price": 800.0,
                "category": "tulips",
                "image_url": "https://example.com/tulips.jpg",
                "is_available": True
            }
        ],
        "total": 2
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 