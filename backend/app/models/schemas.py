from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class GeneralChatRequest(BaseModel):
    message: str = Field(..., description="User's dilemma, query, or prompt text", json_schema_extra={"example": "I feel conflicted because my company favors the founder's son over my most hardworking junior. What should I do?"})
    mode: Optional[str] = Field(default="guidance", description="Mode: 'guidance' (Scenario Match) or 'knowledge' (Raw Verses)")
    provider: Optional[str] = Field(default=None, description="Optional LLM provider override: 'ollama', 'openai', or 'gemini'")

class CharacterChatRequest(BaseModel):
    message: str = Field(..., description="User's dilemma, query, or prompt text", json_schema_extra={"example": "I feel conflicted because my company favors the founder's son over my most hardworking junior. What should I do?"})
    character: str = Field(..., description="Character persona for 1st-person roleplay (e.g. Sita, Vibhishana, Drona, Krishna, Karna)", json_schema_extra={"example": "Vibhishana"})
    mode: Optional[str] = Field(default="guidance", description="Mode: 'guidance' (Scenario Match) or 'knowledge' (Raw Verses)")
    provider: Optional[str] = Field(default=None, description="Optional LLM provider override: 'ollama', 'openai', or 'gemini'")

class SourceCitation(BaseModel):
    scenario_title: Optional[str] = None
    epic: Optional[str] = None
    character: Optional[str] = None
    verse_citations: List[str] = []
    summary_snippet: Optional[str] = None

class ConversationalChatRequest(BaseModel):
    message: str = Field(..., description="Latest message or follow-up question answer from user", json_schema_extra={"example": "I feel burned out at work."})
    chat_history: List[Dict[str, str]] = Field(default=[], description="Full conversation history: [{'role': 'user'|'assistant', 'content': '...'}]")
    character: Optional[str] = Field(default="Epic Counselor", description="Persona to chat with (e.g. 'Epic Counselor', 'Krishna', 'Sita', 'Vibhishana')")
    provider: Optional[str] = Field(default=None, description="Optional LLM provider override")

class ConversationalChatResponse(BaseModel):
    reply: str
    follow_up_questions: List[str] = Field(default=[], description="3 AI-generated dynamic follow-up options for the user")
    character: str
    provider_used: str
    sources: List[SourceCitation] = []

class ChatRequest(BaseModel):
    message: str = Field(..., description="User's dilemma, query, or prompt text")
    mode: Optional[str] = Field(default="guidance", description="Mode: 'guidance' or 'knowledge'")
    character: Optional[str] = Field(default=None, description="Optional character persona for roleplay")
    provider: Optional[str] = Field(default=None, description="Optional LLM provider override")

class ChatResponse(BaseModel):
    reply: str
    mode: str
    character: str
    provider_used: str
    sources: List[SourceCitation] = []

class ScenarioCard(BaseModel):
    scenario_id: str
    epic: str
    parva_kanda: str
    chapter_sarga: str
    title: str
    entities: Dict[str, Any]
    dilemma_profile: Dict[str, Any]
    narrative_context: Dict[str, Any]
    resolution_and_advice: Dict[str, Any]
    scripture_citations: Dict[str, Any]
