from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.chat import router as chat_router
from app.api.strategies import router as strategy_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Python FastAPI Multi-LLM RAG Backend for Chatbot Mythology"
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Existing & Experimental Strategy Routers
app.include_router(chat_router)
app.include_router(strategy_router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "default_provider": settings.DEFAULT_LLM_PROVIDER,
        "ollama_url": settings.OLLAMA_BASE_URL,
        "data_dir_exists": settings.DATA_DIR.exists()
    }
