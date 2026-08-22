import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String, primary_key=True, index=True)  # Matches Supabase auth.users.id
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="user", nullable=False)  # "user" or "admin"
    preferred_app_language = Column(String, default="en", nullable=True)
    preferred_chat_language = Column(String, default="auto", nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sessions = relationship("ChatSessionModel", back_populates="user", cascade="all, delete-orphan")
    telemetry_logs = relationship("ApiTelemetryLog", back_populates="user")


class GuestUsageTracker(Base):
    __tablename__ = "guest_usage_tracker"

    guest_id = Column(String, primary_key=True, index=True)  # Client fingerprint / IP hash
    ip_address = Column(String, nullable=True)
    message_count = Column(Integer, default=0, nullable=False)
    first_seen_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.utcnow)


class ChatSessionModel(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("profiles.id", ondelete="CASCADE"), nullable=True, index=True)
    guest_id = Column(String, nullable=True, index=True)
    mode = Column(String, default="roundtable", nullable=False)  # "roundtable", "full-chat", "persona", "counselor"
    title = Column(String, default="New Consultation", nullable=False)
    metadata_json = Column(JSON, default=dict)  # active_council, stage, selected_guide, etc.
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)

    # Relationships
    user = relationship("Profile", back_populates="sessions")
    messages = relationship("ChatMessageModel", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessageModel.created_at")


class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True, nullable=False)
    role = Column(String, nullable=False)  # "user" | "assistant"
    character = Column(String, nullable=True)  # "Sita", "Krishna", "Scholar", etc.
    content = Column(Text, nullable=False)
    sources_json = Column(JSON, default=list)  # Stored scripture cards
    stage = Column(String, nullable=True)  # "interviewing", "resolved", "follow_up"
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    session = relationship("ChatSessionModel", back_populates="messages")


class ApiTelemetryLog(Base):
    __tablename__ = "api_telemetry_logs"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    guest_id = Column(String, nullable=True, index=True)
    endpoint = Column(String, index=True, nullable=False)  # e.g., "/chat-roundtable"
    tab_mode = Column(String, index=True, nullable=False)  # "roundtable", "full-chat", "persona", etc.
    status_code = Column(Integer, default=200, nullable=False)
    latency_ms = Column(Float, default=0.0, nullable=False)
    provider_used = Column(String, default="gemini/gemini-3.5-flash-lite")
    language = Column(String(10), default="en", index=True)  # "hi", "ta", "en", "te", etc.
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    estimated_cost_usd = Column(Float, default=0.0)
    characters_tagged_json = Column(JSON, default=list)  # ["Krishna", "Sita"]
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("Profile", back_populates="telemetry_logs")


class EpicScenarioEmbeddingModel(Base):
    __tablename__ = "epic_scenario_embeddings"

    id = Column(String, primary_key=True, index=True)
    scenario_title = Column(String, nullable=False)
    epic = Column(String, nullable=False)
    protagonist = Column(String, nullable=True, index=True)
    primary_category = Column(String, nullable=True)
    summary_snippet = Column(Text, nullable=True)
    verse_refs = Column(JSON, default=list)
    search_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class SupportedLanguageModel(Base):
    __tablename__ = "supported_languages"

    code = Column(String(10), primary_key=True, index=True)  # e.g., "hi", "en", "ta", "te"
    name = Column(String(100), nullable=False)               # e.g., "Hindi"
    native_name = Column(String(100), nullable=False)        # e.g., "हिन्दी"
    region = Column(String(150), nullable=True)              # e.g., "Pan-India / North & Central"
    is_app_enabled = Column(Boolean, default=True, nullable=False)   # UI translation availability
    is_chat_enabled = Column(Boolean, default=True, nullable=False)  # AI persona / LLM availability
    is_beta = Column(Boolean, default=False, nullable=False)         # Beta badge in picker
    display_order = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)


class CharacterModel(Base):
    __tablename__ = "characters"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    slug = Column(String(120), unique=True, nullable=False, index=True)
    name = Column(String(120), unique=True, nullable=False, index=True)
    epic = Column(String(30), nullable=False)
    category = Column(String(80), nullable=False)
    role = Column(String(160), nullable=False)
    subtitle = Column(String(160), nullable=False)
    icon = Column(String(20), nullable=False)
    color = Column(String(30), nullable=True)
    accent = Column(String(80), nullable=True)
    quote = Column(Text, nullable=False)
    image_url = Column(Text, nullable=True)
    cloudinary_public_id = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    display_order = Column(Integer, default=0, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


