from fastapi import APIRouter, HTTPException, status
from app.models.strategy_schemas import (
    CompletenessRequest, CompletenessResponse,
    TwoTurnRequest, TwoTurnResponse,
    ProgressiveRequest, ProgressiveResponse,
    SocraticRequest, SocraticResponse,
    FullChatRequest, FullChatResponse
)
from app.services.strategy_service import StrategyService

router = APIRouter(prefix="/strategy", tags=["Experimental Strategies"])
strategy_service = StrategyService()

@router.post("/completeness", response_model=CompletenessResponse, status_code=status.HTTP_200_OK)
async def completeness_endpoint(request: CompletenessRequest) -> CompletenessResponse:
    """
    Strategy 1: Completeness Score (Adaptive AI Check).
    Calculates query completeness (0.0 to 1.0). If score < 0.70, asks clarification with option chips.
    If score >= 0.70, delivers instant ChromaDB match and epic advice!
    """
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message field cannot be empty."
        )

    try:
        response_data = strategy_service.process_completeness(
            message=request.message,
            provider=request.provider
        )
        return CompletenessResponse(**response_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in completeness strategy: {str(e)}"
        )

@router.post("/two-turn", response_model=TwoTurnResponse, status_code=status.HTTP_200_OK)
async def two_turn_endpoint(request: TwoTurnRequest) -> TwoTurnResponse:
    """
    Strategy 2: Structured Two-Turn Flow (Fixed Clarification Turn).
    - Turn 1: Returns 3 clickable option chips to clarify vague dilemmas.
    - Turn 2: Accepts selected_option, queries ChromaDB, and returns final epic guidance.
    """
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message field cannot be empty."
        )

    try:
        response_data = strategy_service.process_two_turn(
            message=request.message,
            turn=request.turn,
            selected_option=request.selected_option,
            provider=request.provider
        )
        return TwoTurnResponse(**response_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in two-turn strategy: {str(e)}"
        )

@router.post("/progressive", response_model=ProgressiveResponse, status_code=status.HTTP_200_OK)
async def progressive_endpoint(request: ProgressiveRequest) -> ProgressiveResponse:
    """
    Strategy 3: Progressive Hybrid Search (Always Match & Ask).
    Performs ChromaDB search on every turn, providing epic advice + 1 refining follow-up question.
    """
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message field cannot be empty."
        )

    try:
        response_data = strategy_service.process_progressive(
            message=request.message,
            chat_history=request.chat_history,
            provider=request.provider
        )
        return ProgressiveResponse(**response_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in progressive strategy: {str(e)}"
        )

@router.post("/socratic-interviewer", response_model=SocraticResponse, status_code=status.HTTP_200_OK)
async def socratic_endpoint(request: SocraticRequest) -> SocraticResponse:
    """
    Strategy 4: Autonomous Socratic Interviewer Engine.
    Continuously engages the user in deep Socratic questioning until sufficient context is gathered.
    Delivers final epic counsel and scripture citations ONLY when context is complete!
    """
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message field cannot be empty."
        )

    try:
        response_data = strategy_service.process_socratic(
            message=request.message,
            chat_history=request.chat_history,
            force_resolve=request.force_resolve or False,
            provider=request.provider
        )
        return SocraticResponse(**response_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in socratic interviewer strategy: {str(e)}"
        )

@router.post("/full-chat", response_model=FullChatResponse, status_code=status.HTTP_200_OK)
async def full_chat_endpoint(request: FullChatRequest) -> FullChatResponse:
    """
    Strategy 5: Full Chat (Continuous Memory + Socratic + Follow-up RAG).
    Handles initial Socratic discovery, delivers Final Epic Counsel, and enables continuous
    follow-up conversation with dynamic vector routing without breaking context!
    """
    if not request.message or not request.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message field cannot be empty."
        )

    try:
        response_data = strategy_service.process_full_chat(
            message=request.message,
            chat_history=request.chat_history,
            force_resolve=request.force_resolve or False,
            session_id=request.session_id,
            provider=request.provider
        )
        return FullChatResponse(**response_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in full chat strategy: {str(e)}"
        )

