from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel

from app.db.session import get_db
from app.core.security import get_current_user_optional, AuthContext
from app.models.db_models import ChatSessionModel, ChatMessageModel

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

class SaveMessagePayload(BaseModel):
    id: Optional[str] = None
    role: str
    content: str
    character: Optional[str] = None
    action: Optional[str] = None
    stage: Optional[str] = None
    sources: Optional[List[Dict[str, Any]]] = None
    searched_vector_db: Optional[bool] = None

class SaveSessionPayload(BaseModel):
    id: Optional[str] = None
    mode: str = "roundtable"
    title: str = "Vedic Consultation"
    council: Optional[List[str]] = None
    character: Optional[str] = None
    stage: Optional[str] = None
    history: List[SaveMessagePayload] = []

@router.get("", summary="List User Sessions")
def list_user_sessions(
    auth: AuthContext = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Returns all chat sessions belonging to the authenticated user (or guest)."""
    query = db.query(ChatSessionModel)
    if auth.is_authenticated:
        query = query.filter(ChatSessionModel.user_id == auth.user_id)
    else:
        query = query.filter(ChatSessionModel.guest_id == auth.guest_id)

    sessions = query.order_by(desc(ChatSessionModel.updated_at)).all()

    results = []
    for s in sessions:
        results.append({
            "id": s.id,
            "title": s.title,
            "mode": s.mode,
            "metadata": s.metadata_json or {},
            "council": (s.metadata_json or {}).get("council", []),
            "character": (s.metadata_json or {}).get("character"),
            "stage": (s.metadata_json or {}).get("stage"),
            "updatedAt": int(s.updated_at.timestamp() * 1000) if s.updated_at else 0,
            "createdAt": int(s.created_at.timestamp() * 1000) if s.created_at else 0,
        })

    return results

@router.get("/{session_id}", summary="Get Session with History")
def get_session_detail(
    session_id: str,
    auth: AuthContext = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Fetches a specific session and all its message turns."""
    session = db.query(ChatSessionModel).filter(ChatSessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify ownership
    if auth.is_authenticated and session.user_id != auth.user_id:
        raise HTTPException(status_code=403, detail="Access denied to this session")
    elif not auth.is_authenticated and session.guest_id != auth.guest_id:
        raise HTTPException(status_code=403, detail="Access denied to this session")

    messages = db.query(ChatMessageModel).filter(
        ChatMessageModel.session_id == session.id
    ).order_by(ChatMessageModel.created_at).all()

    return {
        "id": session.id,
        "title": session.title,
        "mode": session.mode,
        "council": (session.metadata_json or {}).get("council", []),
        "character": (session.metadata_json or {}).get("character"),
        "stage": (session.metadata_json or {}).get("stage"),
        "updatedAt": int(session.updated_at.timestamp() * 1000) if session.updated_at else 0,
        "history": [
            {
                "id": m.id,
                "role": m.role,
                "character": m.character,
                "content": m.content,
                "stage": m.stage,
                "sources": m.sources_json or []
            }
            for m in messages
        ]
    }

@router.post("", summary="Save or Update Session")
def save_session(
    payload: SaveSessionPayload,
    auth: AuthContext = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Persists a complete chat session and its turns to PostgreSQL."""
    session_id = payload.id
    session = None
    if session_id:
        session = db.query(ChatSessionModel).filter(ChatSessionModel.id == session_id).first()

    metadata = {
        "council": payload.council or [],
        "character": payload.character,
        "stage": payload.stage
    }

    if not session:
        session = ChatSessionModel(
            id=session_id,
            user_id=auth.user_id if auth.is_authenticated else None,
            guest_id=auth.guest_id if not auth.is_authenticated else None,
            mode=payload.mode,
            title=payload.title,
            metadata_json=metadata
        )
        db.add(session)
    else:
        session.title = payload.title
        session.mode = payload.mode
        session.metadata_json = metadata

    db.commit()
    db.refresh(session)

    # Sync messages
    # Delete existing to replace with latest transcript snapshot
    db.query(ChatMessageModel).filter(ChatMessageModel.session_id == session.id).delete()

    for msg in payload.history:
        db_msg = ChatMessageModel(
            id=msg.id,
            session_id=session.id,
            role=msg.role,
            character=msg.character,
            content=msg.content,
            stage=msg.stage,
            sources_json=msg.sources or []
        )
        db.add(db_msg)

    db.commit()

    return {
        "status": "saved",
        "session_id": session.id,
        "title": session.title,
        "message_count": len(payload.history)
    }

@router.delete("/{session_id}", summary="Delete Session")
def delete_session(
    session_id: str,
    auth: AuthContext = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Deletes a chat session and cascades deletion of its messages."""
    session = db.query(ChatSessionModel).filter(ChatSessionModel.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if auth.is_authenticated and session.user_id != auth.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(session)
    db.commit()

    return {"status": "deleted", "session_id": session_id}


def auto_save_chat_turn(
    db: Session,
    auth: AuthContext,
    session_id: Optional[str],
    mode: str,
    user_message: str,
    assistant_reply: str,
    character: Optional[str] = None,
    stage: Optional[str] = None,
    sources: Optional[Any] = None,
    title: Optional[str] = None
) -> str:
    """Auto-persists user prompt and assistant reply into PostgreSQL cleanly."""
    import time, uuid

    try:
        sid = session_id or f"sess_{uuid.uuid4().hex[:12]}"
        session = db.query(ChatSessionModel).filter(ChatSessionModel.id == sid).first()

        if not session:
            s_title = title or (user_message[:36] + ("..." if len(user_message) > 36 else ""))
            session = ChatSessionModel(
                id=sid,
                user_id=auth.user_id if auth.is_authenticated else None,
                guest_id=auth.guest_id if not auth.is_authenticated else None,
                mode=mode,
                title=s_title,
                metadata_json={"character": character, "stage": stage}
            )
            db.add(session)
            db.commit()
            db.refresh(session)
        else:
            if auth.is_authenticated and not session.user_id:
                session.user_id = auth.user_id
                db.commit()

        # Convert Pydantic objects or non-dict items in sources to raw dicts
        clean_sources = []
        if sources:
            for s in sources:
                if hasattr(s, "model_dump"):
                    clean_sources.append(s.model_dump())
                elif hasattr(s, "dict"):
                    clean_sources.append(s.dict())
                elif isinstance(s, dict):
                    clean_sources.append(s)
                else:
                    clean_sources.append(str(s))

        t_now = int(time.time() * 1000)
        msg_user = ChatMessageModel(
            id=f"msg_u_{t_now}_{uuid.uuid4().hex[:4]}",
            session_id=session.id,
            role="user",
            content=user_message,
            stage=stage
        )
        msg_asst = ChatMessageModel(
            id=f"msg_a_{t_now}_{uuid.uuid4().hex[:4]}",
            session_id=session.id,
            role="assistant",
            character=character or "Universal Epic Scholar",
            content=assistant_reply,
            stage=stage,
            sources_json=clean_sources
        )

        db.add(msg_user)
        db.add(msg_asst)
        db.commit()
        return session.id
    except Exception as e:
        db.rollback()
        print(f"⚠️ [Auto-Save Session Notice]: {e}")
        return session_id or "sess_fallback"


