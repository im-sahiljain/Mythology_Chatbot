import numpy as np
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.db.session import get_db
from app.core.security import require_admin, AuthContext
from app.models.db_models import (
    Profile,
    ChatSessionModel,
    ChatMessageModel,
    ApiTelemetryLog,
    GuestUsageTracker,
    EpicScenarioEmbeddingModel
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/overview", summary="Admin Overview Metrics")
def get_admin_overview(
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Returns high-level application health, financial cost, user count, and performance metrics."""
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)

    total_users = db.query(func.count(Profile.id)).scalar() or 0
    active_users_today = db.query(func.count(func.distinct(ApiTelemetryLog.user_id))).filter(
        ApiTelemetryLog.timestamp >= today_start
    ).scalar() or 0

    total_sessions = db.query(func.count(ChatSessionModel.id)).scalar() or 0
    total_messages = db.query(func.count(ChatMessageModel.id)).scalar() or 0

    # Token & Cost Metrics
    telemetry_agg = db.query(
        func.sum(ApiTelemetryLog.prompt_tokens).label("total_prompt"),
        func.sum(ApiTelemetryLog.completion_tokens).label("total_completion"),
        func.sum(ApiTelemetryLog.estimated_cost_usd).label("total_cost"),
        func.avg(ApiTelemetryLog.latency_ms).label("avg_latency"),
        func.count(ApiTelemetryLog.id).label("total_api_calls")
    ).first()

    total_prompt_tokens = int(telemetry_agg.total_prompt or 0)
    total_completion_tokens = int(telemetry_agg.total_completion or 0)
    total_cost_usd = float(telemetry_agg.total_cost or 0.0)
    avg_latency_ms = round(float(telemetry_agg.avg_latency or 0.0), 2)
    total_api_calls = int(telemetry_agg.total_api_calls or 0)

    # Guest count
    total_guests = db.query(func.count(GuestUsageTracker.guest_id)).scalar() or 0

    return {
        "total_users": total_users,
        "active_users_today": active_users_today,
        "total_guests": total_guests,
        "total_sessions": total_sessions,
        "total_messages": total_messages,
        "total_api_calls": total_api_calls,
        "total_tokens": total_prompt_tokens + total_completion_tokens,
        "prompt_tokens": total_prompt_tokens,
        "completion_tokens": total_completion_tokens,
        "total_cost_usd": round(total_cost_usd, 5),
        "avg_latency_ms": avg_latency_ms
    }

@router.get("/tab-usage", summary="Usage by Tab Mode")
def get_tab_usage_stats(
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Returns request volume, token usage, and cost grouped by consultation mode/tab."""
    tab_stats = db.query(
        ApiTelemetryLog.tab_mode,
        func.count(ApiTelemetryLog.id).label("request_count"),
        func.sum(ApiTelemetryLog.prompt_tokens + ApiTelemetryLog.completion_tokens).label("tokens"),
        func.sum(ApiTelemetryLog.estimated_cost_usd).label("cost_usd"),
        func.avg(ApiTelemetryLog.latency_ms).label("avg_latency")
    ).group_by(ApiTelemetryLog.tab_mode).order_by(desc("request_count")).all()

    total_requests = sum([s.request_count for s in tab_stats]) or 1

    results = []
    for s in tab_stats:
        results.append({
            "tab_mode": s.tab_mode or "unknown",
            "request_count": s.request_count,
            "percentage": round((s.request_count / total_requests) * 100, 1),
            "tokens": int(s.tokens or 0),
            "cost_usd": round(float(s.cost_usd or 0.0), 5),
            "avg_latency_ms": round(float(s.avg_latency or 0.0), 2)
        })

    return results

@router.get("/cost-analytics", summary="LLM Cost & Provider Analytics")
def get_cost_analytics(
    days: int = Query(7, ge=1, le=90),
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Returns token consumption and estimated cost breakdown per LLM provider."""
    since_date = datetime.utcnow() - timedelta(days=days)

    provider_stats = db.query(
        ApiTelemetryLog.provider_used,
        func.count(ApiTelemetryLog.id).label("calls"),
        func.sum(ApiTelemetryLog.prompt_tokens).label("prompt_tokens"),
        func.sum(ApiTelemetryLog.completion_tokens).label("completion_tokens"),
        func.sum(ApiTelemetryLog.estimated_cost_usd).label("cost_usd")
    ).filter(ApiTelemetryLog.timestamp >= since_date).group_by(ApiTelemetryLog.provider_used).all()

    providers = []
    for p in provider_stats:
        providers.append({
            "provider": p.provider_used or "gemini",
            "total_calls": p.calls,
            "prompt_tokens": int(p.prompt_tokens or 0),
            "completion_tokens": int(p.completion_tokens or 0),
            "total_tokens": int((p.prompt_tokens or 0) + (p.completion_tokens or 0)),
            "cost_usd": round(float(p.cost_usd or 0.0), 5)
        })

    return {
        "timeframe_days": days,
        "providers": providers
    }

@router.get("/latency-analytics", summary="API Latency & Health Percentiles")
def get_latency_analytics(
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Computes API latency percentiles (p50, p95, p99) and status code distribution."""
    latencies = [
        row[0] for row in db.query(ApiTelemetryLog.latency_ms).order_by(desc(ApiTelemetryLog.timestamp)).limit(500).all()
        if row[0] is not None
    ]

    if latencies:
        p50 = float(np.percentile(latencies, 50))
        p95 = float(np.percentile(latencies, 95))
        p99 = float(np.percentile(latencies, 99))
        avg_val = float(np.mean(latencies))
        min_val = float(np.min(latencies))
        max_val = float(np.max(latencies))
    else:
        p50, p95, p99, avg_val, min_val, max_val = 0.0, 0.0, 0.0, 0.0, 0.0, 0.0

    # Status distribution
    status_counts = db.query(
        ApiTelemetryLog.status_code,
        func.count(ApiTelemetryLog.id)
    ).group_by(ApiTelemetryLog.status_code).all()

    status_dist = {str(code): count for code, count in status_counts}

    return {
        "p50_ms": round(p50, 2),
        "p95_ms": round(p95, 2),
        "p99_ms": round(p99, 2),
        "avg_ms": round(avg_val, 2),
        "min_ms": round(min_val, 2),
        "max_ms": round(max_val, 2),
        "sample_size": len(latencies),
        "status_distribution": status_dist
    }

@router.get("/character-stats", summary="Character & Legend Popularity Stats")
def get_character_popularity(
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Calculates mention and invocation frequency of epic characters across all modes."""
    char_counts = db.query(
        ChatMessageModel.character,
        func.count(ChatMessageModel.id).label("count")
    ).filter(
        ChatMessageModel.role == "assistant",
        ChatMessageModel.character != None
    ).group_by(ChatMessageModel.character).order_by(desc("count")).all()

    total = sum([c.count for c in char_counts]) or 1

    return [
        {
            "character": c.character,
            "dialogue_count": c.count,
            "percentage": round((c.count / total) * 100, 1)
        }
        for c in char_counts
    ]

@router.get("/users", summary="List All Users")
def list_registered_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Returns paginated registered user profiles and their activity statistics."""
    users = db.query(Profile).order_by(desc(Profile.created_at)).offset(skip).limit(limit).all()

    results = []
    for u in users:
        session_count = db.query(func.count(ChatSessionModel.id)).filter(ChatSessionModel.user_id == u.id).scalar() or 0
        message_count = db.query(func.count(ChatMessageModel.id)).join(
            ChatSessionModel, ChatMessageModel.session_id == ChatSessionModel.id
        ).filter(ChatSessionModel.user_id == u.id).scalar() or 0

        results.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name or "Seeker",
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login_at": u.last_login_at.isoformat() if u.last_login_at else None,
            "total_sessions": session_count,
            "total_messages": message_count
        })

    return results

@router.get("/users/{user_id}/chats", summary="Inspect User Chat Transcripts")
def inspect_user_chats(
    user_id: str,
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Allows administrators to inspect all chat sessions and message transcripts for a specific user."""
    sessions = db.query(ChatSessionModel).filter(
        ChatSessionModel.user_id == user_id
    ).order_by(desc(ChatSessionModel.updated_at)).all()

    results = []
    for s in sessions:
        msgs = db.query(ChatMessageModel).filter(
            ChatMessageModel.session_id == s.id
        ).order_by(ChatMessageModel.created_at).all()

        results.append({
            "session_id": s.id,
            "mode": s.mode,
            "title": s.title,
            "metadata": s.metadata_json or {},
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            "message_count": len(msgs),
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "character": m.character,
                    "content": m.content,
                    "stage": m.stage,
                    "sources": m.sources_json or [],
                    "created_at": m.created_at.isoformat() if m.created_at else None
                }
                for m in msgs
            ]
        })

    return results

@router.get("/guest-usage", summary="Guest Quota & Telemetry")
def get_guest_usage_stats(
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Returns metrics on non-authenticated guest usage and 3-message limit triggers."""
    total_guests = db.query(func.count(GuestUsageTracker.guest_id)).scalar() or 0
    guests_hitting_limit = db.query(func.count(GuestUsageTracker.guest_id)).filter(
        GuestUsageTracker.message_count >= 3
    ).scalar() or 0
    total_guest_msgs = db.query(func.sum(GuestUsageTracker.message_count)).scalar() or 0

    return {
        "total_guests": total_guests,
        "guests_hitting_3_turn_limit": guests_hitting_limit,
        "total_guest_messages_sent": int(total_guest_msgs or 0),
        "guest_limit_reach_percentage": round((guests_hitting_limit / (total_guests or 1)) * 100, 1)
    }


@router.get("/guest-sessions", summary="Inspect Guest Chat Transcripts")
def inspect_guest_chats(
    limit: int = Query(100, ge=1, le=500),
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Allows administrators to inspect guest (non-authenticated) chat sessions and message transcripts."""
    sessions = db.query(ChatSessionModel).filter(
        ChatSessionModel.user_id == None
    ).order_by(desc(ChatSessionModel.updated_at)).limit(limit).all()

    results = []
    for s in sessions:
        msgs = db.query(ChatMessageModel).filter(
            ChatMessageModel.session_id == s.id
        ).order_by(ChatMessageModel.created_at).all()

        results.append({
            "session_id": s.id,
            "guest_id": s.guest_id,
            "mode": s.mode,
            "title": s.title,
            "metadata": s.metadata_json or {},
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
            "message_count": len(msgs),
            "messages": [
                {
                    "id": m.id,
                    "role": m.role,
                    "character": m.character,
                    "content": m.content,
                    "stage": m.stage,
                    "sources": m.sources_json or [],
                    "created_at": m.created_at.isoformat() if m.created_at else None
                }
                for m in msgs
            ]
        })

    return results


@router.get("/time-series", summary="Time-Series Request & Cost Analytics")
def get_time_series_analytics(
    days: int = Query(7, ge=1, le=90),
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Generates daily aggregated metrics for requests, token counts, USD cost, and active users."""
    now = datetime.utcnow()
    since_date = now - timedelta(days=days - 1)
    
    daily_records = []
    for d in range(days):
        day_date = (since_date + timedelta(days=d)).date()
        day_start = datetime(day_date.year, day_date.month, day_date.day, 0, 0, 0)
        day_end = day_start + timedelta(days=1)
        
        agg = db.query(
            func.count(ApiTelemetryLog.id).label("requests"),
            func.sum(ApiTelemetryLog.prompt_tokens + ApiTelemetryLog.completion_tokens).label("tokens"),
            func.sum(ApiTelemetryLog.estimated_cost_usd).label("cost"),
            func.avg(ApiTelemetryLog.latency_ms).label("avg_latency"),
            func.count(func.distinct(ApiTelemetryLog.user_id)).label("active_users")
        ).filter(
            ApiTelemetryLog.timestamp >= day_start,
            ApiTelemetryLog.timestamp < day_end
        ).first()
        
        daily_records.append({
            "date": day_date.strftime("%b %d"),
            "iso_date": str(day_date),
            "requests": int(agg.requests or 0) if agg else 0,
            "tokens": int(agg.tokens or 0) if agg else 0,
            "cost_usd": round(float(agg.cost or 0.0), 5) if agg else 0.0,
            "avg_latency_ms": round(float(agg.avg_latency or 0.0), 1) if agg else 0.0,
            "active_users": int(agg.active_users or 0) if agg else 0
        })
        
    return {
        "timeframe_days": days,
        "series": daily_records
    }


@router.get("/scripture-insights", summary="Scripture & Knowledge Base Analytics")
def get_scripture_insights(
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Provides analytics on indexed scripture vectors, categories, and epic distribution."""
    total_scenarios = db.query(func.count(EpicScenarioEmbeddingModel.id)).scalar() or 0
    
    epic_counts = db.query(
        EpicScenarioEmbeddingModel.epic,
        func.count(EpicScenarioEmbeddingModel.id).label("count")
    ).group_by(EpicScenarioEmbeddingModel.epic).all()
    
    epics_dist = [
        {"epic": e.epic or "Universal", "count": e.count, "percentage": round((e.count / (total_scenarios or 1)) * 100, 1)}
        for e in epic_counts
    ]
    
    cat_counts = db.query(
        EpicScenarioEmbeddingModel.primary_category,
        func.count(EpicScenarioEmbeddingModel.id).label("count")
    ).group_by(EpicScenarioEmbeddingModel.primary_category).order_by(desc("count")).limit(8).all()
    
    top_categories = [
        {"category": (c.primary_category or "General").replace("_", " "), "count": c.count}
        for c in cat_counts
    ]
    
    return {
        "total_indexed_scenarios": total_scenarios,
        "epics_distribution": epics_dist,
        "top_categories": top_categories
    }


@router.get("/raw-logs", summary="Real-Time Telemetry Feed")
def get_raw_telemetry_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Returns recent raw API telemetry logs for live monitoring."""
    logs = db.query(ApiTelemetryLog).order_by(desc(ApiTelemetryLog.timestamp)).offset(skip).limit(limit).all()
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "endpoint": l.endpoint,
            "tab_mode": l.tab_mode,
            "status_code": l.status_code,
            "latency_ms": l.latency_ms,
            "provider_used": l.provider_used,
            "prompt_tokens": l.prompt_tokens,
            "completion_tokens": l.completion_tokens,
            "total_tokens": (l.prompt_tokens or 0) + (l.completion_tokens or 0),
            "cost_usd": l.estimated_cost_usd,
            "user_id": l.user_id,
            "guest_id": l.guest_id,
            "characters": l.characters_tagged_json or []
        }
        for l in logs
    ]
