import time
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user_optional, AuthContext
from app.core.telemetry import record_api_telemetry
from app.models.strategy_schemas import FullChatRequest, FullChatResponse
from app.services.strategy_service import StrategyService
from app.api.sessions import auto_save_chat_turn


router = APIRouter(prefix="/strategy", tags=["Interactive Strategy"])
strategy_service = StrategyService()


@router.post("/full-chat", response_model=FullChatResponse, status_code=status.HTTP_200_OK)
async def full_chat_endpoint(
    request: FullChatRequest,
    auth: AuthContext = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> FullChatResponse:
    """
    Strategy 5: Full Chat (Continuous Memory + Socratic + Follow-up RAG).
    """
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message field cannot be empty."
        )

    start_time = time.time()
    try:
        response_data = strategy_service.process_full_chat(
            message=request.message,
            chat_history=request.chat_history,
            force_resolve=request.force_resolve or False,
            session_id=request.session_id,
            provider=request.provider
        )
        latency_ms = (time.time() - start_time) * 1000

        record_api_telemetry(
            db=db,
            endpoint="/strategy/full-chat",
            tab_mode="full-chat",
            latency_ms=latency_ms,
            status_code=200,
            user_id=auth.user_id,
            guest_id=auth.guest_id,
            provider_used=response_data.get("provider_used", "gemini"),
            prompt_text=request.message,
            completion_text=response_data.get("reply", "")
        )

        auto_save_chat_turn(
            db=db,
            auth=auth,
            session_id=request.session_id,
            mode="full-chat",
            user_message=request.message,
            assistant_reply=response_data.get("reply", ""),
            character=response_data.get("character") or "Universal Epic Scholar",
            stage=response_data.get("stage"),
            sources=response_data.get("sources", [])
        )

        return FullChatResponse(**response_data)

    except HTTPException:
        raise
    except Exception as e:
        latency_ms = (time.time() - start_time) * 1000
        record_api_telemetry(
            db=db,
            endpoint="/strategy/full-chat",
            tab_mode="full-chat",
            latency_ms=latency_ms,
            status_code=500,
            user_id=auth.user_id,
            guest_id=auth.guest_id,
            prompt_text=request.message
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in full chat strategy: {str(e)}"
        )
