from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.db_models import ApiTelemetryLog, GuestUsageTracker

def estimate_tokens(text: str) -> int:
    """Rough estimation of tokens: ~1 token per 4 characters."""
    if not text:
        return 0
    return max(1, len(text) // 4)

def calculate_llm_cost(prompt_tokens: int, completion_tokens: int, provider: str) -> float:
    """Calculates estimated cost in USD based on provider token pricing."""
    p_lower = (provider or "").lower()
    if "flash" in p_lower:
        # Flash rates: $0.075 / 1M prompt, $0.30 / 1M completion
        return (prompt_tokens * 0.000000075) + (completion_tokens * 0.00000030)
    elif "pro" in p_lower:
        # Pro rates: $3.50 / 1M prompt, $10.50 / 1M completion
        return (prompt_tokens * 0.0000035) + (completion_tokens * 0.0000105)
    elif "gpt-4" in p_lower:
        return (prompt_tokens * 0.000005) + (completion_tokens * 0.000015)
    else:
        # Ollama or local
        return 0.0

def record_api_telemetry(
    db: Session,
    endpoint: str,
    tab_mode: str,
    latency_ms: float,
    status_code: int = 200,
    user_id: Optional[str] = None,
    guest_id: Optional[str] = None,
    provider_used: str = "gemini/gemini-3.5-flash-lite",
    prompt_text: str = "",
    completion_text: str = "",
    characters_tagged: Optional[List[str]] = None
):
    """
    Logs API request telemetry and increments guest counter if applicable.
    Runs purely against PostgreSQL (No Redis).
    """
    try:
        prompt_tokens = estimate_tokens(prompt_text)
        completion_tokens = estimate_tokens(completion_text)
        cost_usd = calculate_llm_cost(prompt_tokens, completion_tokens, provider_used)

        log_entry = ApiTelemetryLog(
            user_id=user_id,
            guest_id=guest_id,
            endpoint=endpoint,
            tab_mode=tab_mode,
            status_code=status_code,
            latency_ms=round(latency_ms, 2),
            provider_used=provider_used,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            estimated_cost_usd=round(cost_usd, 7),
            characters_tagged_json=characters_tagged or []
        )
        db.add(log_entry)

        # If guest, increment their lifetime message count
        if not user_id and guest_id:
            tracker = db.query(GuestUsageTracker).filter(GuestUsageTracker.guest_id == guest_id).first()
            if tracker:
                tracker.message_count += 1

        db.commit()
    except Exception as e:
        print(f"⚠️ [Telemetry Warning] Could not write telemetry log: {e}")
        try:
            db.rollback()
        except:
            pass
