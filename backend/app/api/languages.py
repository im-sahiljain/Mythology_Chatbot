from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app.db.session import get_db
from app.core.security import require_admin, AuthContext
from app.models.db_models import SupportedLanguageModel

router = APIRouter(tags=["Languages"])

# ─── Pydantic Schemas ──────────────────────────────────────────

class LanguageResponse(BaseModel):
    code: str
    name: str
    native_name: str
    region: Optional[str] = None
    is_app_enabled: bool
    is_chat_enabled: bool
    is_beta: bool
    display_order: int
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class LanguageUpdateRequest(BaseModel):
    is_app_enabled: Optional[bool] = None
    is_chat_enabled: Optional[bool] = None
    is_beta: Optional[bool] = None
    display_order: Optional[int] = None

class AdminLanguageOverviewResponse(BaseModel):
    total_languages: int
    app_enabled_count: int
    chat_enabled_count: int
    beta_count: int
    languages: List[LanguageResponse]

# ─── Canonical Seed Data (22 Scheduled Indic + English) ────────

DEFAULT_LANGUAGES = [
    {"code": "en", "name": "English", "native_name": "English", "region": "Global / India", "is_app_enabled": True, "is_chat_enabled": True, "is_beta": False, "display_order": 1},
    {"code": "hi", "name": "Hindi", "native_name": "हिन्दी", "region": "North / Central India", "is_app_enabled": True, "is_chat_enabled": True, "is_beta": False, "display_order": 2},
    {"code": "sa", "name": "Sanskrit", "native_name": "संस्कृतम्", "region": "Ancient / Vedic", "is_app_enabled": True, "is_chat_enabled": True, "is_beta": False, "display_order": 3},
    {"code": "ta", "name": "Tamil", "native_name": "தமிழ்", "region": "Tamil Nadu & Puducherry", "is_app_enabled": True, "is_chat_enabled": True, "is_beta": False, "display_order": 4},
    {"code": "te", "name": "Telugu", "native_name": "తెలుగు", "region": "Andhra Pradesh & Telangana", "is_app_enabled": True, "is_chat_enabled": True, "is_beta": False, "display_order": 5},
    {"code": "bn", "name": "Bengali", "native_name": "বাংলা", "region": "West Bengal & Tripura", "is_app_enabled": True, "is_chat_enabled": True, "is_beta": False, "display_order": 6},
    {"code": "mr", "name": "Marathi", "native_name": "मराठी", "region": "Maharashtra", "is_app_enabled": True, "is_chat_enabled": True, "is_beta": False, "display_order": 7},
    {"code": "gu", "name": "Gujarati", "native_name": "ગુજરાતી", "region": "Gujarat", "is_app_enabled": True, "is_chat_enabled": True, "is_beta": False, "display_order": 8},
    {"code": "kn", "name": "Kannada", "native_name": "ಕನ್ನಡ", "region": "Karnataka", "is_app_enabled": True, "is_chat_enabled": True, "is_beta": False, "display_order": 9},
    {"code": "ml", "name": "Malayalam", "native_name": "മലയാളം", "region": "Kerala", "is_app_enabled": True, "is_chat_enabled": True, "is_beta": False, "display_order": 10},
    {"code": "pa", "name": "Punjabi", "native_name": "ਪੰਜਾਬੀ", "region": "Punjab", "is_app_enabled": True, "is_chat_enabled": True, "is_beta": False, "display_order": 11},
    {"code": "or", "name": "Odia", "native_name": "ଓଡ଼ିଆ", "region": "Odisha", "is_app_enabled": True, "is_chat_enabled": True, "is_beta": False, "display_order": 12},
    {"code": "as", "name": "Assamese", "native_name": "অসমীয়া", "region": "Assam", "is_app_enabled": True, "is_chat_enabled": True, "is_beta": False, "display_order": 13},
    {"code": "ur", "name": "Urdu", "native_name": "اردو", "region": "North / Deccan India", "is_app_enabled": True, "is_chat_enabled": True, "is_beta": False, "display_order": 14},
    {"code": "mai", "name": "Maithili", "native_name": "मैथिली", "region": "Bihar", "is_app_enabled": False, "is_chat_enabled": True, "is_beta": True, "display_order": 15},
    {"code": "ks", "name": "Kashmiri", "native_name": "कॉशुर / کٲشُر", "region": "Jammu & Kashmir", "is_app_enabled": False, "is_chat_enabled": True, "is_beta": True, "display_order": 16},
    {"code": "ne", "name": "Nepali", "native_name": "नेपाली", "region": "Sikkim & West Bengal", "is_app_enabled": False, "is_chat_enabled": True, "is_beta": True, "display_order": 17},
    {"code": "sd", "name": "Sindhi", "native_name": "سنڌي / सिंधी", "region": "Western India", "is_app_enabled": False, "is_chat_enabled": True, "is_beta": True, "display_order": 18},
    {"code": "kok", "name": "Konkani", "native_name": "कोंकणी", "region": "Goa & Coastal Karnataka", "is_app_enabled": False, "is_chat_enabled": True, "is_beta": True, "display_order": 19},
    {"code": "doi", "name": "Dogri", "native_name": "डोगरी", "region": "Jammu", "is_app_enabled": False, "is_chat_enabled": True, "is_beta": True, "display_order": 20},
    {"code": "mni", "name": "Manipuri (Meitei)", "native_name": "মৈতৈলোন্", "region": "Manipur", "is_app_enabled": False, "is_chat_enabled": True, "is_beta": True, "display_order": 21},
    {"code": "brx", "name": "Bodo", "native_name": "बड़ो", "region": "Assam", "is_app_enabled": False, "is_chat_enabled": True, "is_beta": True, "display_order": 22},
    {"code": "sat", "name": "Santali", "native_name": "संताली / Ol Chiki", "region": "Jharkhand & Odisha", "is_app_enabled": False, "is_chat_enabled": True, "is_beta": True, "display_order": 23},
]

def seed_default_languages_if_empty(db: Session):
    """Seed standard languages into table if table is empty or missing rows."""
    count = db.query(SupportedLanguageModel).count()
    if count == 0:
        for item in DEFAULT_LANGUAGES:
            lang = SupportedLanguageModel(
                code=item["code"],
                name=item["name"],
                native_name=item["native_name"],
                region=item["region"],
                is_app_enabled=item["is_app_enabled"],
                is_chat_enabled=item["is_chat_enabled"],
                is_beta=item["is_beta"],
                display_order=item["display_order"],
                updated_at=datetime.utcnow()
            )
            db.add(lang)
        db.commit()
    else:
        # Check if any new language code needs to be inserted
        existing_codes = {row.code for row in db.query(SupportedLanguageModel.code).all()}
        added = False
        for item in DEFAULT_LANGUAGES:
            if item["code"] not in existing_codes:
                lang = SupportedLanguageModel(
                    code=item["code"],
                    name=item["name"],
                    native_name=item["native_name"],
                    region=item["region"],
                    is_app_enabled=item["is_app_enabled"],
                    is_chat_enabled=item["is_chat_enabled"],
                    is_beta=item["is_beta"],
                    display_order=item["display_order"],
                    updated_at=datetime.utcnow()
                )
                db.add(lang)
                added = True
        if added:
            db.commit()


# ─── Public Endpoints ──────────────────────────────────────────

@router.get("/api/languages", response_model=List[LanguageResponse], summary="Get Available App & Chat Languages")
def get_public_languages(db: Session = Depends(get_db)):
    """
    Public endpoint for clients (mobile & web).
    Returns list of languages currently active in the system.
    """
    seed_default_languages_if_empty(db)
    languages = db.query(SupportedLanguageModel).order_by(asc(SupportedLanguageModel.display_order)).all()
    return languages


# ─── Admin Endpoints ───────────────────────────────────────────

@router.get("/api/admin/languages", response_model=AdminLanguageOverviewResponse, summary="Get Full Language Management Grid")
def get_admin_languages(
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin-only endpoint to view all languages, their enabled toggles, and aggregate statistics.
    """
    seed_default_languages_if_empty(db)
    languages = db.query(SupportedLanguageModel).order_by(asc(SupportedLanguageModel.display_order)).all()
    
    total = len(languages)
    app_count = sum(1 for l in languages if l.is_app_enabled)
    chat_count = sum(1 for l in languages if l.is_chat_enabled)
    beta_count = sum(1 for l in languages if l.is_beta)

    return {
        "total_languages": total,
        "app_enabled_count": app_count,
        "chat_enabled_count": chat_count,
        "beta_count": beta_count,
        "languages": languages
    }


@router.patch("/api/admin/languages/{code}", response_model=LanguageResponse, summary="Update Language Toggles")
def update_admin_language(
    code: str = Path(..., description="Language ISO code e.g. 'hi'"),
    payload: LanguageUpdateRequest = ...,
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin-only endpoint to toggle is_app_enabled, is_chat_enabled, or is_beta for any language.
    """
    lang = db.query(SupportedLanguageModel).filter(SupportedLanguageModel.code == code.lower()).first()
    if not lang:
        raise HTTPException(status_code=404, detail=f"Language with code '{code}' not found.")

    if payload.is_app_enabled is not None:
        lang.is_app_enabled = payload.is_app_enabled
    if payload.is_chat_enabled is not None:
        lang.is_chat_enabled = payload.is_chat_enabled
    if payload.is_beta is not None:
        lang.is_beta = payload.is_beta
    if payload.display_order is not None:
        lang.display_order = payload.display_order

    lang.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lang)

    return lang


@router.post("/api/admin/languages/reset-defaults", response_model=List[LanguageResponse], summary="Reset Languages to Default Config")
def reset_admin_languages(
    admin: AuthContext = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin-only endpoint to reset all languages to initial standard configuration.
    """
    for item in DEFAULT_LANGUAGES:
        existing = db.query(SupportedLanguageModel).filter(SupportedLanguageModel.code == item["code"]).first()
        if existing:
            existing.name = item["name"]
            existing.native_name = item["native_name"]
            existing.region = item["region"]
            existing.is_app_enabled = item["is_app_enabled"]
            existing.is_chat_enabled = item["is_chat_enabled"]
            existing.is_beta = item["is_beta"]
            existing.display_order = item["display_order"]
            existing.updated_at = datetime.utcnow()
        else:
            lang = SupportedLanguageModel(
                code=item["code"],
                name=item["name"],
                native_name=item["native_name"],
                region=item["region"],
                is_app_enabled=item["is_app_enabled"],
                is_chat_enabled=item["is_chat_enabled"],
                is_beta=item["is_beta"],
                display_order=item["display_order"],
                updated_at=datetime.utcnow()
            )
            db.add(lang)
    db.commit()
    return db.query(SupportedLanguageModel).order_by(asc(SupportedLanguageModel.display_order)).all()
