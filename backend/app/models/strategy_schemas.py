from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.models.schemas import SourceCitation

# Full Chat (Continuous Socratic + Counsel + Follow-Up Memory)
class FullChatRequest(BaseModel):
    message: str = Field(..., description="User's latest message or follow-up question")
    chat_history: List[Dict[str, Any]] = Field(default=[], description="Full conversation transcript: [{'role': 'user'|'assistant', 'content': '...', 'sources': [...]}]")
    session_id: Optional[str] = Field(default=None, description="Optional unique session ID for tracking")
    force_resolve: Optional[bool] = Field(default=False, description="Manual override to trigger final epic counsel immediately")
    provider: Optional[str] = Field(default=None, description="LLM provider: 'gemini', 'ollama', or 'openai'")

class FullChatResponse(BaseModel):
    stage: str = Field(..., description="Current conversation stage: 'interviewing' | 'resolved' | 'follow_up'")
    reply: str = Field(..., description="AI response text")
    character: str = Field(default="Epic Scholar")
    sources: List[SourceCitation] = Field(default=[], description="Retrieved scripture cards (if vector search was performed)")
    searched_vector_db: bool = Field(default=False, description="True if vector search was executed, False if direct history answer")
    provider_used: Optional[str] = None
