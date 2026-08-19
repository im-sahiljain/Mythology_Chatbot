import time
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user_optional, AuthContext
from app.core.telemetry import record_api_telemetry
from app.models.schemas import (
    CharacterChatRequest,
    ChatResponse,
    RoundtableChatRequest,
    RoundtableChatResponse,
)
from app.services.strategy_service import StrategyService
from app.api.sessions import auto_save_chat_turn


router = APIRouter()
strategy_service = StrategyService()

@router.post("/chat-character", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_character_endpoint(
    request: CharacterChatRequest,
    auth: AuthContext = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> ChatResponse:
    """
    Character-Strict Socratic Chat Endpoint (POST /chat-character).
    Multi-turn context-gathering with the selected character in 1st person.
    """
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message field cannot be empty."
        )

    start_time = time.time()
    try:
        response_data = strategy_service.process_character_socratic_chat(
            message=request.message,
            character=request.character,
            chat_history=request.chat_history or [],
            force_resolve=request.force_resolve or False,
            session_id=request.session_id,
            provider=request.provider
        )
        latency_ms = (time.time() - start_time) * 1000

        # Record Telemetry in PostgreSQL
        record_api_telemetry(
            db=db,
            endpoint="/chat-character",
            tab_mode="persona",
            latency_ms=latency_ms,
            status_code=200,
            user_id=auth.user_id,
            guest_id=auth.guest_id,
            provider_used=response_data.get("provider_used", "gemini"),
            prompt_text=request.message,
            completion_text=response_data.get("reply", ""),
            characters_tagged=[request.character] if request.character else []
        )

        auto_save_chat_turn(
            db=db,
            auth=auth,
            session_id=request.session_id,
            mode="persona",
            user_message=request.message,
            assistant_reply=response_data.get("reply", ""),
            character=response_data.get("character") or request.character,
            stage=response_data.get("stage"),
            sources=response_data.get("sources", [])
        )

        return ChatResponse(**response_data)
    except HTTPException:
        raise
    except Exception as e:
        latency_ms = (time.time() - start_time) * 1000
        record_api_telemetry(
            db=db,
            endpoint="/chat-character",
            tab_mode="persona",
            latency_ms=latency_ms,
            status_code=500,
            user_id=auth.user_id,
            guest_id=auth.guest_id,
            prompt_text=request.message
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing character-strict chat request: {str(e)}"
        )

@router.post("/chat-roundtable", response_model=RoundtableChatResponse, status_code=status.HTTP_200_OK)
async def chat_roundtable_endpoint(
    request: RoundtableChatRequest,
    auth: AuthContext = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> RoundtableChatResponse:
    """
    User-Controlled Multi-Legend Council Endpoint (POST /chat-roundtable).
    Collaborative dialogue across multiple invited legends with 1st-person personas,
    @mention targeting, mute controls, and dismissal support.
    """
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message field cannot be empty."
        )

    start_time = time.time()
    try:
        response_data = strategy_service.process_roundtable_chat(
            message=request.message,
            council_characters=request.council_characters or ["Sita", "Krishna"],
            muted_characters=request.muted_characters or [],
            chat_history=request.chat_history or [],
            force_resolve=request.force_resolve or False,
            session_id=request.session_id,
            provider=request.provider
        )
        latency_ms = (time.time() - start_time) * 1000

        # Combine replies text for token estimation
        replies = response_data.get("replies", [])
        combined_replies = " ".join([r.get("content", "") for r in replies])
        spoken_chars = [r.get("character") for r in replies if r.get("character")]

        # Record Telemetry in PostgreSQL
        record_api_telemetry(
            db=db,
            endpoint="/chat-roundtable",
            tab_mode="roundtable",
            latency_ms=latency_ms,
            status_code=200,
            user_id=auth.user_id,
            guest_id=auth.guest_id,
            provider_used=response_data.get("provider_used", "gemini"),
            prompt_text=request.message,
            completion_text=combined_replies,
            characters_tagged=spoken_chars or request.council_characters
        )

        auto_save_chat_turn(
            db=db,
            auth=auth,
            session_id=request.session_id,
            mode="roundtable",
            user_message=request.message,
            assistant_reply=combined_replies,
            character=", ".join(spoken_chars) if spoken_chars else "Vedic Council",
            stage=response_data.get("stage"),
            sources=response_data.get("sources", [])
        )

        return RoundtableChatResponse(**response_data)
    except HTTPException:
        raise
    except Exception as e:
        latency_ms = (time.time() - start_time) * 1000
        record_api_telemetry(
            db=db,
            endpoint="/chat-roundtable",
            tab_mode="roundtable",
            latency_ms=latency_ms,
            status_code=500,
            user_id=auth.user_id,
            guest_id=auth.guest_id,
            prompt_text=request.message
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing roundtable council chat request: {str(e)}"
        )
