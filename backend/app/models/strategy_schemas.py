from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.models.schemas import SourceCitation

# 1. Completeness Score Request & Response
class CompletenessRequest(BaseModel):
    message: str = Field(..., description="User's dilemma or prompt text", json_schema_extra={"example": "I am struggling with my co-founder."})
    provider: Optional[str] = Field(default=None, description="LLM provider: 'gemini', 'ollama', or 'openai'")

class CompletenessResponse(BaseModel):
    status: str = Field(..., description="'needs_clarification' if vague (<0.70), or 'resolved' if detailed (>=0.70)")
    completeness_score: float = Field(..., description="Calculated completeness score from 0.0 to 1.0")
    reply: str = Field(..., description="Clarifying question OR final epic advice")
    options: List[str] = Field(default=[], description="Suggested option chips if clarification is needed")
    provider_used: Optional[str] = None
    sources: List[SourceCitation] = Field(default=[], description="Retrieved scripture sources (if resolved)")

# 2. Two-Turn Flow Request & Response
class TwoTurnRequest(BaseModel):
    message: str = Field(..., description="User's dilemma text", json_schema_extra={"example": "I am having a conflict with my business partner."})
    turn: int = Field(default=1, description="Turn number: 1 (initial query) or 2 (after choosing option)")
    selected_option: Optional[str] = Field(default=None, description="The option selected by user in Turn 1 (e.g., 'Financial Fraud')", json_schema_extra={"example": "Financial Fraud"})
    provider: Optional[str] = Field(default=None, description="LLM provider")

class TwoTurnResponse(BaseModel):
    turn: int
    reply: str
    options: List[str] = Field(default=[], description="Clickable options returned on Turn 1")
    sources: List[SourceCitation] = Field(default=[], description="Scripture citation cards returned on Turn 2")

# 3. Progressive Hybrid Request & Response
class ProgressiveRequest(BaseModel):
    message: str = Field(..., description="User's current message", json_schema_extra={"example": "I am burned out and struggling at work."})
    chat_history: List[Dict[str, str]] = Field(default=[], description="Previous conversation turns [{'role': 'user'/'assistant', 'content': '...'}]")
    provider: Optional[str] = Field(default=None, description="LLM provider")

class ProgressiveResponse(BaseModel):
    reply: str = Field(..., description="Progressive advice combining reflection + follow-up question")
    sources: List[SourceCitation] = Field(default=[], description="Top matched epic sources updated on every turn")

# 4. Autonomous Socratic Interviewer Request & Response
class SocraticRequest(BaseModel):
    message: str = Field(..., description="Latest message from user", json_schema_extra={"example": "I'm thinking of quitting my startup."})
    chat_history: List[Dict[str, str]] = Field(default=[], description="Accumulated conversation turns: [{'role': 'user'|'assistant', 'content': '...'}]")
    force_resolve: Optional[bool] = Field(default=False, description="Manual user override to force final epic counsel immediately")
    provider: Optional[str] = Field(default=None, description="LLM provider: 'gemini', 'ollama', or 'openai'")

class SocraticResponse(BaseModel):
    status: str = Field(..., description="'interviewing' if gathering more context, or 'resolved' if sufficient context gathered")
    reply: str = Field(..., description="Deep clarifying question OR final epic counsel")
    character: str = Field(default="Epic Counselor")
    provider_used: Optional[str] = None
    sources: List[SourceCitation] = Field(default=[], description="Retrieved scripture citation cards (returned when resolved)")

# 5. Full Chat (Continuous Socratic + Counsel + Follow-Up Memory)
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
