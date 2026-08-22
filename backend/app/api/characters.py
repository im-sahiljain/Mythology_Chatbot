import hashlib
import json
import re
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from io import BytesIO
from PIL import Image
import cloudinary
import cloudinary.uploader
import requests
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import asc
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import AuthContext, require_admin
from app.db.session import get_db
from app.models.db_models import CharacterModel

router = APIRouter(tags=["Characters"])

DEFAULT_IMAGE_TRANSFORM = {"width": 500, "height": 667, "crop": "fill", "quality": "auto", "fetch_format": "auto"}
MAX_COMPRESSED_IMAGE_SIZE = 0.5 * 1024 * 1024  # 2 MB
MAX_UPLOAD_SIZE = 20 * 1024 * 1024           # 20 MB

class CharacterBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    epic: str = Field(..., min_length=1, max_length=30)
    category: str = Field(..., min_length=1, max_length=80)
    role: str = Field(..., min_length=1, max_length=160)
    subtitle: str = Field(..., min_length=1, max_length=160)
    icon: str = Field(..., min_length=1, max_length=20)
    color: Optional[str] = Field(default=None, max_length=30)
    accent: Optional[str] = Field(default=None, max_length=80)
    quote: str = Field(..., min_length=1)
    is_active: bool = True
    display_order: int = Field(default=0, ge=0)


class CharacterCreate(CharacterBase):
    image_url: Optional[str] = None


class CharacterBulkImport(BaseModel):
    characters: List[CharacterCreate] = Field(..., min_length=1, max_length=500)


class CharacterUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    epic: Optional[str] = Field(default=None, min_length=1, max_length=30)
    category: Optional[str] = Field(default=None, min_length=1, max_length=80)
    role: Optional[str] = Field(default=None, min_length=1, max_length=160)
    subtitle: Optional[str] = Field(default=None, min_length=1, max_length=160)
    icon: Optional[str] = Field(default=None, min_length=1, max_length=20)
    color: Optional[str] = Field(default=None, max_length=30)
    accent: Optional[str] = Field(default=None, max_length=80)
    quote: Optional[str] = Field(default=None, min_length=1)
    is_active: Optional[bool] = None
    display_order: Optional[int] = Field(default=None, ge=0)


class CharacterResponse(CharacterBase):
    quote: str
    id: str
    slug: str
    image_url: Optional[str] = None
    cloudinary_public_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def slugify(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not value:
        raise HTTPException(status_code=422, detail="Character name must contain letters or numbers")
    return value


def character_dict(character: CharacterModel) -> dict:
    return {"id": character.id, "slug": character.slug, "name": character.name, "epic": character.epic,
            "category": character.category, "role": character.role, "subtitle": character.subtitle,
            "icon": character.icon, "color": character.color, "accent": character.accent,
            "quote": character.quote, "image_url": character.image_url, "is_active": character.is_active,
            "display_order": character.display_order}


def read_static_characters() -> list[dict]:
    source = Path(__file__).resolve().parents[3] / "frontend" / "src" / "data" / "characters.ts"
    if not source.exists():
        return []
    text = source.read_text(encoding="utf-8")
    records = []
    for block in re.findall(r"\{\s*name:\s*\"[^\n]+.*?(?=\n  \},)", text, re.DOTALL):
        def field(name: str, default: Optional[str] = None) -> Optional[str]:
            match = re.search(rf"\b{name}:\s*\"((?:\\.|[^\"])*)\"", block, re.DOTALL)
            return json.loads('"' + match.group(1) + '"') if match else default

        name = field("name")
        if not name or field("epic") is None:
            continue
        records.append({"name": name, "epic": field("epic"), "category": field("category"),
                        "role": field("role"), "subtitle": field("subtitle"), "icon": field("icon"),
                        "color": field("color"), "accent": field("accent"), "quote": field("quote", ""),
                        "image_url": field("imageUrl"), "is_active": True, "display_order": len(records)})
    return records


def seed_characters_if_empty(db: Session) -> None:
    if db.query(CharacterModel).count() != 0:
        return
    records = read_static_characters()
    if not records:
        return
    for item in records:
        db.add(CharacterModel(slug=slugify(item["name"]), **item))
    db.commit()


def configure_cloudinary() -> None:
    if not all((settings.CLOUDINARY_CLOUD_NAME, settings.CLOUDINARY_API_KEY, settings.CLOUDINARY_API_SECRET)):
        raise HTTPException(status_code=503, detail="Cloudinary is not configured")
    cloudinary.config(cloud_name=settings.CLOUDINARY_CLOUD_NAME, api_key=settings.CLOUDINARY_API_KEY,
                     api_secret=settings.CLOUDINARY_API_SECRET, secure=True)

def compress_image(content: bytes, content_type: str) -> bytes:
    original_size = len(content)
    image = Image.open(BytesIO(content))

    print(
        f"[IMAGE] Original: "
        f"format={image.format}, "
        f"type={content_type}, "
        f"size={original_size / (1024 * 1024):.2f} MB, "
        f"dimensions={image.width}x{image.height}"
    )

    # JPEG does not support transparency.
    # PNG/WebP with transparency will be converted to RGB.
    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGB")
    elif image.mode != "RGB":
        image = image.convert("RGB")

    quality = 90

    while quality >= 20:
        output = BytesIO()

        image.save(
            output,
            format="JPEG",
            quality=quality,
            optimize=True,
        )

        compressed = output.getvalue()

        if len(compressed) <= MAX_COMPRESSED_IMAGE_SIZE:
            compressed_size = len(compressed)
            reduction = (1 - compressed_size / original_size) * 100

            print(
                f"[IMAGE] Compressed: "
                f"format=JPEG, "
                f"size={compressed_size / (1024 * 1024):.2f} MB, "
                f"quality={quality}, "
                f"reduction={reduction:.1f}%"
            )

            return compressed

        quality -= 5

    print(
        f"[IMAGE] Compression failed: "
        f"original={original_size / (1024 * 1024):.2f} MB"
    )

    raise HTTPException(
        status_code=413,
        detail="Unable to compress image to 2 MB or smaller",
    )

def upload_image_bytes(
    content: bytes,
    slug: str,
    content_type: str
) -> tuple[str, str]:

    if content_type not in {
        "image/jpeg",
        "image/png",
        "image/webp"
    }:
        raise HTTPException(
            status_code=415,
            detail=f"Image for '{slug}' must be JPEG, PNG, or WebP"
        )

    configure_cloudinary()

    result = cloudinary.uploader.upload(
        content,
        folder="vedic_mythology/characters",
        public_id=slug,
        overwrite=True,
        resource_type="image"
    )

    return (
        cloudinary.utils.cloudinary_url(
            result["public_id"],
            secure=True,
            transformation=DEFAULT_IMAGE_TRANSFORM
        )[0],
        result["public_id"]
    )
def upload_remote_image(image_url: str, slug: str) -> tuple[str, str]:
    if not image_url.startswith(("http://", "https://")):
        raise HTTPException(status_code=422, detail=f"Image URL for '{slug}' must start with http:// or https://")
    try:
        remote = requests.get(image_url, timeout=20, stream=True)
        remote.raise_for_status()
        content_type = (remote.headers.get("content-type") or "").split(";", 1)[0].lower()
        if content_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise HTTPException(status_code=415, detail=f"Image for '{slug}' must be JPEG, PNG, or WebP")
        content = remote.content
    except HTTPException:
        raise
    except requests.RequestException as error:
        raise HTTPException(status_code=422, detail=f"Could not download image for '{slug}': {error}")
    return upload_image_bytes(content, slug, content_type)


@router.get("/api/characters", response_model=List[CharacterResponse])
def get_public_characters(response: Response, db: Session = Depends(get_db)):
    seed_characters_if_empty(db)
    characters = db.query(CharacterModel).filter(CharacterModel.is_active.is_(True)).order_by(asc(CharacterModel.display_order), asc(CharacterModel.name)).all()
    version = hashlib.sha256("|".join(f"{c.id}:{c.updated_at.isoformat()}" for c in characters).encode()).hexdigest()
    response.headers["ETag"] = f'"{version}"'
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
    return characters


@router.get("/api/admin/characters", response_model=List[CharacterResponse])
def get_admin_characters(admin: AuthContext = Depends(require_admin), db: Session = Depends(get_db)):
    seed_characters_if_empty(db)
    return db.query(CharacterModel).order_by(asc(CharacterModel.display_order), asc(CharacterModel.name)).all()


@router.post("/api/admin/characters", response_model=CharacterResponse, status_code=201)
def create_character(payload: CharacterCreate, admin: AuthContext = Depends(require_admin), db: Session = Depends(get_db)):
    slug = slugify(payload.name)
    if db.query(CharacterModel).filter((CharacterModel.slug == slug) | (CharacterModel.name.ilike(payload.name))).first():
        raise HTTPException(status_code=409, detail="A character with this name already exists")
    character = CharacterModel(slug=slug, **payload.model_dump())
    db.add(character)
    db.commit()
    db.refresh(character)
    return character


@router.post("/api/admin/characters/bulk", response_model=List[CharacterResponse])
async def bulk_import_characters(payload: str = Form(...), images: List[UploadFile] = File(default=[]), admin: AuthContext = Depends(require_admin), db: Session = Depends(get_db)):
    """Create or update many characters in one transaction, matched by case-insensitive name."""
    try:
        import_payload = CharacterBulkImport.model_validate_json(payload)
    except Exception as error:
        raise HTTPException(status_code=422, detail=f"Invalid character JSON: {error}")
    names = [item.name.strip() for item in import_payload.characters]
    normalized_names = [name.casefold() for name in names]
    if len(set(normalized_names)) != len(normalized_names):
        raise HTTPException(status_code=422, detail="The JSON contains duplicate character names")

    existing = {
        character.name.casefold(): character
        for character in db.query(CharacterModel).filter(CharacterModel.name.in_(names)).all()
    }
    saved = []
    image_by_index = {int(image.filename.split("__", 1)[0]): image for image in images if image.filename and image.filename.split("__", 1)[0].isdigit()}
    configure_cloudinary() if image_by_index or any(item.image_url for item in import_payload.characters) else None
    for index, item in enumerate(import_payload.characters):
        clean_name = item.name.strip()
        character = existing.get(clean_name.casefold())
        values = item.model_dump()
        values["name"] = clean_name
        selected_image = image_by_index.get(index)
        if selected_image:
            values["image_url"], values["cloudinary_public_id"] = upload_image_bytes(await selected_image.read(), slugify(clean_name), selected_image.content_type or "")
        elif item.image_url:
            values["image_url"], values["cloudinary_public_id"] = upload_remote_image(item.image_url, slugify(clean_name))
        if character:
            previous_public_id = character.cloudinary_public_id
            metadata_values = {key: value for key, value in values.items() if key not in {"image_url", "cloudinary_public_id"}}
            for key, value in metadata_values.items():
                setattr(character, key, value)
            character.slug = slugify(clean_name)
            if item.image_url:
                character.image_url = values["image_url"]
                character.cloudinary_public_id = values["cloudinary_public_id"]
                if previous_public_id and previous_public_id != values["cloudinary_public_id"]:
                    cloudinary.uploader.destroy(previous_public_id, invalidate=True)
            character.updated_at = datetime.utcnow()
        else:
            character = CharacterModel(
                slug=slugify(clean_name),
                display_order=item.display_order if item.display_order else index,
                **values,
            )
            db.add(character)
        saved.append(character)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=409, detail="Bulk import could not be saved")
    for character in saved:
        db.refresh(character)
    return saved


@router.patch("/api/admin/characters/{character_id}", response_model=CharacterResponse)
def update_character(character_id: str, payload: CharacterUpdate, admin: AuthContext = Depends(require_admin), db: Session = Depends(get_db)):
    character = db.query(CharacterModel).filter(CharacterModel.id == character_id).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates:
        new_slug = slugify(updates["name"])
        duplicate = db.query(CharacterModel).filter(CharacterModel.id != character.id, (CharacterModel.slug == new_slug) | (CharacterModel.name.ilike(updates["name"]))).first()
        if duplicate:
            raise HTTPException(status_code=409, detail="A character with this name already exists")
        character.slug = new_slug
    for key, value in updates.items():
        setattr(character, key, value)
    character.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(character)
    return character


@router.delete("/api/admin/characters/{character_id}")
def delete_character(character_id: str, admin: AuthContext = Depends(require_admin), db: Session = Depends(get_db)):
    character = db.query(CharacterModel).filter(CharacterModel.id == character_id).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    if character.cloudinary_public_id:
        configure_cloudinary()
        cloudinary.uploader.destroy(character.cloudinary_public_id, invalidate=True)
    db.delete(character)
    db.commit()
    return {"deleted": True}


@router.post("/api/admin/characters/{character_id}/image", response_model=CharacterResponse)
def upload_character_image(character_id: str, image: UploadFile = File(...), admin: AuthContext = Depends(require_admin), db: Session = Depends(get_db)):
    character = db.query(CharacterModel).filter(CharacterModel.id == character_id).first()
    if not character:
        raise HTTPException(status_code=404, detail="Character not found")
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Only JPEG, PNG, and WebP images are supported")
    contents = image.file.read()    

    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Image must be 20 MB or smaller",
        )

    contents = compress_image(
        contents,
        image.content_type,
    )
    configure_cloudinary()
    result = cloudinary.uploader.upload(contents, folder="vedic_mythology/characters", public_id=f"{character.slug}", overwrite=True,
                                        resource_type="image")
    if character.cloudinary_public_id and character.cloudinary_public_id != result["public_id"]:
        cloudinary.uploader.destroy(character.cloudinary_public_id, invalidate=True)
    character.image_url = cloudinary.utils.cloudinary_url(
        result["public_id"], secure=True, transformation=DEFAULT_IMAGE_TRANSFORM
    )[0]
    character.cloudinary_public_id = result["public_id"]
    character.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(character)
    return character
