from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models.subject import Subject, Module, Concept
from app.models.flashcard import Flashcard, DifficultyLevel
from app.services.extractor import (
    extract_text_from_pdf,
    extract_text_from_docx,
    extract_study_content,
)

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/plain": "txt",
}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.post("/extract")
async def extract_from_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a PDF/DOCX and get back a structured study system preview (not yet saved)."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT files are supported.")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Max size is 20 MB.")

    file_type = ALLOWED_TYPES[file.content_type]
    if file_type == "pdf":
        text = extract_text_from_pdf(data)
    elif file_type == "docx":
        text = extract_text_from_docx(data)
    else:
        text = data.decode("utf-8", errors="ignore")

    if len(text.strip()) < 100:
        raise HTTPException(status_code=422, detail="Could not extract enough text from this file.")

    extracted = await extract_study_content(text)
    return {"preview": extracted, "char_count": len(text)}


@router.post("/save")
async def save_extracted_content(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a confirmed AI extraction to the database."""
    preview = body.get("preview")
    if not preview:
        raise HTTPException(status_code=400, detail="No content to save.")

    subject = Subject(
        owner_id=current_user.id,
        title=preview.get("subject_title", "Untitled Subject"),
        description=preview.get("subject_description", ""),
        mastery_score=0.0,
    )
    db.add(subject)
    db.flush()

    now = datetime.utcnow()
    total_cards = 0

    for mod_data in preview.get("modules", []):
        module = Module(
            subject_id=subject.id,
            title=mod_data.get("title", "Module"),
            mastery_score=0.0,
        )
        db.add(module)
        db.flush()

        for concept_data in mod_data.get("concepts", []):
            concept = Concept(
                module_id=module.id,
                title=concept_data.get("title", ""),
                explanation=concept_data.get("explanation", ""),
                mastery_score=0.0,
                next_review_at=now + timedelta(days=1),
            )
            db.add(concept)

        for card_data in mod_data.get("flashcards", []):
            raw_diff = card_data.get("difficulty", "medium").lower()
            difficulty = DifficultyLevel(raw_diff) if raw_diff in ("easy", "medium", "hard") else DifficultyLevel.medium
            card = Flashcard(
                module_id=module.id,
                question=card_data.get("question", ""),
                answer=card_data.get("answer", ""),
                difficulty=difficulty,
                next_review_at=now,
            )
            db.add(card)
            total_cards += 1

    db.commit()
    db.refresh(subject)

    return {
        "subject_id": subject.id,
        "title": subject.title,
        "modules": len(preview.get("modules", [])),
        "flashcards_created": total_cards,
    }
