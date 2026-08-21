from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from supabase import create_client

from app.config import settings
from app.db.session import get_db
from app.models.db_models import Profile
from app.core.security import get_current_user_optional, require_authenticated_user, set_auth_cookie, clear_auth_cookie, AuthContext

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class UserPreferencesUpdate(BaseModel):
    preferred_app_language: Optional[str] = None
    preferred_chat_language: Optional[str] = None

@router.post("/login", summary="Sign in and set HttpOnly Cookie")
def auth_login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Authenticates credentials against Supabase and sets a secure HttpOnly cookie."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise HTTPException(status_code=500, detail="Supabase credentials missing in server config.")

    supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    try:
        auth_res = supabase_client.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })
        token = auth_res.session.access_token
        set_auth_cookie(response, token)

        profile = db.query(Profile).filter(Profile.id == auth_res.user.id).first()

        return {
            "status": "authenticated",
            "user": {
                "id": auth_res.user.id,
                "email": auth_res.user.email,
                "preferred_app_language": getattr(profile, 'preferred_app_language', 'en') if profile else 'en',
                "preferred_chat_language": getattr(profile, 'preferred_chat_language', 'auto') if profile else 'auto'
            },
            "access_token": token
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid login credentials: {str(e)}")

@router.post("/logout", summary="Sign out and clear HttpOnly Cookie")
def auth_logout(response: Response):
    """Clears the HttpOnly authentication cookie."""
    clear_auth_cookie(response)
    return {"status": "logged_out"}

@router.get("/me", summary="Get Current Authenticated User")
def auth_me(auth: AuthContext = Depends(get_current_user_optional)):
    """Returns profile for currently authenticated user via HttpOnly Cookie or Bearer Token."""
    return {
        "is_authenticated": auth.is_authenticated,
        "user_id": auth.user_id,
        "email": auth.email,
        "role": auth.role,
        "preferred_app_language": auth.preferred_app_language,
        "preferred_chat_language": auth.preferred_chat_language,
    }

@router.get("/preferences", summary="Get User Preferences from Database")
def get_user_preferences(
    auth: AuthContext = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Fetches user preferences from PostgreSQL/Supabase database."""
    profile = db.query(Profile).filter(Profile.id == auth.user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    
    return {
        "preferred_app_language": profile.preferred_app_language or "en",
        "preferred_chat_language": profile.preferred_chat_language or "auto",
    }

@router.put("/preferences", summary="Update User Preferences in Database")
def update_user_preferences(
    payload: UserPreferencesUpdate,
    auth: AuthContext = Depends(require_authenticated_user),
    db: Session = Depends(get_db)
):
    """Saves user preferences to PostgreSQL/Supabase database."""
    profile = db.query(Profile).filter(Profile.id == auth.user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")

    if payload.preferred_app_language is not None:
        profile.preferred_app_language = payload.preferred_app_language
    if payload.preferred_chat_language is not None:
        profile.preferred_chat_language = payload.preferred_chat_language

    db.commit()
    db.refresh(profile)

    return {
        "status": "updated",
        "preferred_app_language": profile.preferred_app_language,
        "preferred_chat_language": profile.preferred_chat_language,
    }
