from fastapi import APIRouter, HTTPException, status
from app.models.schemas import GeneralChatRequest, CharacterChatRequest, ChatResponse
from app.services.rag_service import RAGService
from app.services.strategy_service import StrategyService

router = APIRouter()
rag_service = RAGService()
strategy_service = StrategyService()

@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_endpoint(request: GeneralChatRequest) -> ChatResponse:
    """
    General Chat Endpoint (POST /chat).
    Searches across all epic stories in Ramayana & Mahabharata without character bias,
    returning guidance from an Epic Scholar.
    """
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message field cannot be empty."
        )

    try:
        response_data = rag_service.query(
            message=request.message,
            mode=request.mode or "guidance",
            provider=request.provider
        )
        return ChatResponse(**response_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing chat request: {str(e)}"
        )

@router.post("/chat-character", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_character_endpoint(request: CharacterChatRequest) -> ChatResponse:
    """
    Character-Strict Socratic Chat Endpoint (POST /chat-character).
    Multi-turn context-gathering with the selected character in 1st person.
    """
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message field cannot be empty."
        )

    try:
        response_data = strategy_service.process_character_socratic_chat(
            message=request.message,
            character=request.character,
            chat_history=request.chat_history or [],
            force_resolve=request.force_resolve or False,
            session_id=request.session_id,
            provider=request.provider
        )
        return ChatResponse(**response_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing character-strict chat request: {str(e)}"
        )
