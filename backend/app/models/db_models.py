import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, JSON, ForeignKey
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

