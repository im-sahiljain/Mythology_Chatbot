from fastapi import APIRouter, HTTPException, status
from app.models.schemas import GeneralChatRequest, CharacterChatRequest, ChatResponse
from app.services.rag_service import RAGService

router = APIRouter()
rag_service = RAGService()

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
    Character-Strict Chat Endpoint (POST /chat-character).
    Filters ChromaDB vector search strictly by the requested character's own story,
    returning an authentic 1st-person roleplay response (e.g. Sita, Vibhishana, Drona, Krishna).
    """
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message field cannot be empty."
        )

    try:
        response_data = rag_service.query_by_character(
            message=request.message,
            character=request.character,
            mode=request.mode or "guidance",
            provider=request.provider
        )
        return ChatResponse(**response_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing character-strict chat request: {str(e)}"
        )
