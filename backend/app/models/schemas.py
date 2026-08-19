from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class SourceCitation(BaseModel):
    scenario_title: Optional[str] = None
    epic: Optional[str] = None
    character: Optional[str] = None
    verse_citations: List[str] = []
    summary_snippet: Optional[str] = None

class CharacterChatRequest(BaseModel):
    message: str = Field(..., description="User's dilemma, query, or prompt text", json_schema_extra={"example": "I feel conflicted because my company favors the founder's son over my most hardworking junior. What should I do?"})
    character: str = Field(..., description="Character persona for 1st-person roleplay (e.g. Sita, Vibhishana, Drona, Krishna, Karna)", json_schema_extra={"example": "Krishna"})
    chat_history: Optional[List[Dict[str, Any]]] = Field(default=[], description="Full conversation history: [{'role': 'user'|'assistant', 'content': '...'}]")
    session_id: Optional[str] = Field(default=None, description="Optional unique session ID")
    force_resolve: Optional[bool] = Field(default=False, description="Manual override to trigger final counsel immediately")
    mode: Optional[str] = Field(default="guidance", description="Mode: 'guidance' (Scenario Match) or 'knowledge' (Raw Verses)")
    provider: Optional[str] = Field(default=None, description="Optional LLM provider override: 'ollama', 'openai', or 'gemini'")

class ChatResponse(BaseModel):
    reply: str
    mode: str = "guidance"
    character: str
    stage: Optional[str] = Field(default="resolved", description="'interviewing' | 'resolved' | 'follow_up'")
    searched_vector_db: Optional[bool] = False
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

class RoundtableSpeakerReply(BaseModel):
    character: str
    action: str = Field(default="speak", description="'speak' | 'join' | 'depart'")
    content: str
    sources: List[SourceCitation] = []
    stage: Optional[str] = Field(default=None, description="'interviewing' | 'resolved' | 'follow_up'")

class RoundtableChatRequest(BaseModel):
    message: str = Field(..., description="User's message or question to the council")
    council_characters: List[str] = Field(default=["Sita", "Krishna"], description="List of currently active council legends")
    muted_characters: Optional[List[str]] = Field(default=[], description="List of characters currently muted")
    chat_history: Optional[List[Dict[str, Any]]] = Field(default=[], description="Shared conversation history")
    force_resolve: Optional[bool] = Field(default=False, description="Manual override to force immediate counsel resolution")
    session_id: Optional[str] = Field(default=None, description="Session ID")
    provider: Optional[str] = Field(default=None, description="Optional LLM provider override")

class RoundtableChatResponse(BaseModel):
    replies: List[RoundtableSpeakerReply]
    active_council: List[str]
    muted_council: List[str] = []
    stage: Optional[str] = Field(default="resolved", description="Current conversation stage: 'interviewing' | 'resolved' | 'follow_up'")
    provider_used: str
