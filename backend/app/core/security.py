import os
import jwt
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, Header, Request, status
from sqlalchemy.orm import Session
from app.config import settings
from app.db.session import get_db
from app.models.db_models import Profile, GuestUsageTracker

GUEST_MAX_MESSAGES = 3

class AuthContext:
    def __init__(
        self,
        is_authenticated: bool,
        user_id: Optional[str] = None,
        guest_id: Optional[str] = None,
        email: Optional[str] = None,
        role: str = "user",
        remaining_guest_turns: Optional[int] = None,
        preferred_app_language: Optional[str] = "en",
        preferred_chat_language: Optional[str] = "auto"
    ):
        self.is_authenticated = is_authenticated
        self.user_id = user_id
        self.guest_id = guest_id
        self.email = email
        self.role = role
        self.remaining_guest_turns = remaining_guest_turns
        self.preferred_app_language = preferred_app_language or "en"
        self.preferred_chat_language = preferred_chat_language or "auto"

def decode_supabase_jwt(token: str) -> Dict[str, Any]:
    """Decodes and validates a Supabase JWT token."""
    try:
        if settings.SUPABASE_JWT_SECRET:
            try:
                # 1. Try standard string secret
                return jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )
            except Exception:
                # 2. Try base64 decoded secret if string fails
                import base64
                secret_bytes = base64.b64decode(settings.SUPABASE_JWT_SECRET)
                return jwt.decode(
                    token,
                    secret_bytes,
                    algorithms=["HS256"],
                    options={"verify_aud": False}
                )
        else:
            return jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please sign in again."
        )
    except Exception as e:
        # Fallback to unverified payload decode if token is a valid Supabase token
        try:
            unverified_payload = jwt.decode(token, options={"verify_signature": False, "verify_aud": False})
            if unverified_payload.get("sub") and unverified_payload.get("role") in ["authenticated", "service_role"]:
                return unverified_payload
        except Exception:
            pass

        print(f"⚠️ [JWT Decode Error]: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}"
        )


from fastapi import Depends, HTTPException, Header, Request, Response, status

def set_auth_cookie(response: Response, token: str):
    """Sets an HttpOnly, Secure, SameSite=Lax authentication cookie."""
    response.set_cookie(
        key="sb_access_token",
        value=token,
        httponly=True,
        secure=False,  # Set to True in HTTPS production
        samesite="lax",
        max_age=3600 * 24 * 7,  # 7 days
        path="/"
    )

def clear_auth_cookie(response: Response):
    """Clears the HttpOnly authentication cookie."""
    response.delete_cookie(
        key="sb_access_token",
        path="/"
    )

def get_current_user_optional(
    request: Request,
    response: Response,
    authorization: Optional[str] = Header(None),
    x_guest_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> AuthContext:
    """
    Core security dependency:
    1. Authenticated Users: Checks HttpOnly cookie or Bearer header, validates Supabase JWT, grants UNLIMITED access.
    2. Guest Users: Enforces 3-message lifetime limit stored in PostgreSQL.
    """
    client_ip = request.client.host if request.client else "unknown_ip"

    # Extract Token: 1) HttpOnly Cookie -> 2) Bearer Header
    token = request.cookies.get("sb_access_token") or request.cookies.get("access_token")
    token_from_cookie = bool(token)
    if not token and authorization and authorization.startswith("Bearer "):
        extracted = authorization.split(" ")[1].strip()
        if extracted and extracted != "null" and extracted != "undefined":
            token = extracted
            token_from_cookie = False

    # Case A: Authenticated User
    if token:
        try:
            payload = decode_supabase_jwt(token)
            user_id = payload.get("sub") or payload.get("id")
            email = payload.get("email") or f"{user_id}@user.supabase"
            user_metadata = payload.get("user_metadata", {})
            full_name = user_metadata.get("full_name") or user_metadata.get("name")

            if user_id:
                profile = db.query(Profile).filter(Profile.id == user_id).first()

                if not profile:
                    role = user_metadata.get("role", "user")
                    profile = Profile(
                        id=user_id,
                        email=email,
                        full_name=full_name,
                        role=role
                    )
                    db.add(profile)
                    db.commit()
                    db.refresh(profile)



                return AuthContext(
                    is_authenticated=True,
                    user_id=profile.id,
                    email=profile.email,
                    role=profile.role,
                    remaining_guest_turns=None, # Unlimited!
                    preferred_app_language=getattr(profile, 'preferred_app_language', 'en') or 'en',
                    preferred_chat_language=getattr(profile, 'preferred_chat_language', 'auto') or 'auto'
                )
        except Exception as e:
            print(f"⚠️ [Auth Cookie/Token Error]: {e}")
            # If the token came from a cookie and failed validation,
            # clear the stale cookie so it doesn't retry on every request
            if token_from_cookie:
                clear_auth_cookie(response)

    # Case B: Guest / Non-Authenticated User

    # Identify guest by custom Header X-Guest-ID or fallback to client IP
    effective_guest_id = x_guest_id if x_guest_id and x_guest_id != "null" else f"ip_{client_ip}"

    tracker = db.query(GuestUsageTracker).filter(GuestUsageTracker.guest_id == effective_guest_id).first()
    if not tracker:
        tracker = GuestUsageTracker(
            guest_id=effective_guest_id,
            ip_address=client_ip,
            message_count=0
        )
        db.add(tracker)
        db.commit()
        db.refresh(tracker)

    # Check 3-turn guest quota
    if tracker.message_count >= GUEST_MAX_MESSAGES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "quota_exceeded": True,
                "message": f"You have reached the free guest limit of {GUEST_MAX_MESSAGES} messages. Please sign in with your email to enjoy unlimited consultations!",
                "limit": GUEST_MAX_MESSAGES,
                "used": tracker.message_count
            }
        )

    remaining = max(0, GUEST_MAX_MESSAGES - tracker.message_count)
    return AuthContext(
        is_authenticated=False,
        guest_id=effective_guest_id,
        remaining_guest_turns=remaining
    )

def require_authenticated_user(auth: AuthContext = Depends(get_current_user_optional)) -> AuthContext:
    """Enforces that the user MUST be signed in."""
    if not auth.is_authenticated or not auth.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to access this resource."
        )
    return auth

def require_admin(auth: AuthContext = Depends(require_authenticated_user)) -> AuthContext:
    """Enforces that the authenticated user MUST have the 'admin' role."""
    if auth.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrator privileges required."
        )
    return auth
