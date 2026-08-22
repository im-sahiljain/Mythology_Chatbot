from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.db.session import engine, Base
import app.models.db_models  # Ensure models are imported for metadata creation
from app.api.chat import router as chat_router
from app.api.strategies import router as strategy_router
from app.api.admin import router as admin_router
from app.api.sessions import router as sessions_router
from app.api.auth import router as auth_router
from app.api.languages import router as languages_router, seed_default_languages_if_empty
from app.api.characters import router as characters_router, seed_characters_if_empty
from app.db.session import SessionLocal

# Auto-create tables on startup in Supabase PostgreSQL
Base.metadata.create_all(bind=engine)

# Ensure new profile & telemetry columns exist if tables were created previously
try:
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_app_language VARCHAR DEFAULT 'en';"))
        conn.execute(text("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_chat_language VARCHAR DEFAULT 'auto';"))
        conn.execute(text("ALTER TABLE api_telemetry_logs ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';"))
except Exception as e:
    print(f"Schema update notice: {e}")

# Initial seed for supported_languages table
try:
    with SessionLocal() as db:
        seed_default_languages_if_empty(db)
except Exception as e:
    print(f"Language seed notice: {e}")

try:
    with SessionLocal() as db:
        seed_characters_if_empty(db)
except Exception as e:
    print(f"Character seed notice: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Python FastAPI Multi-LLM RAG Backend for Chatbot Mythology"
)

# Configure CORS Middleware with Cookie Credentials Support
origins = [
    "http://localhost:8081",
    "http://127.0.0.1:8081",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "http://localhost:19006",
    "https://mythology.imsahiljain.in",
    "http://mythology.imsahiljain.in",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|.*\.imsahiljain\.in):?\d*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(strategy_router)
app.include_router(sessions_router)
app.include_router(admin_router)
app.include_router(languages_router)
app.include_router(characters_router)



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
