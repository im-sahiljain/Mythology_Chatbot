from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from supabase import create_client

from app.config import settings
from app.db.session import get_db
from app.core.security import get_current_user_optional, set_auth_cookie, clear_auth_cookie, AuthContext

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

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

        return {
            "status": "authenticated",
            "user": {
                "id": auth_res.user.id,
                "email": auth_res.user.email
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
        "role": auth.role
    }
