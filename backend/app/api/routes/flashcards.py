from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime, timedelta
from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models.subject import Subject, Module
from app.models.flashcard import Flashcard, DifficultyLevel

router = APIRouter()


class FlashcardCreate(BaseModel):
    module_id: int
    question: str
    answer: str
    difficulty: DifficultyLevel = DifficultyLevel.medium


class ReviewRequest(BaseModel):
    flashcard_id: int
    quality: int  # 0-5 (SM-2 scale)


class FlashcardResponse(BaseModel):
    id: int
    question: str
    answer: str
    difficulty: str
    next_review_at: datetime | None

    class Config:
        from_attributes = True


def _sm2_update(card: Flashcard, quality: int):
    """Apply SM-2 spaced repetition algorithm."""
    if quality < 3:
        card.repetitions = 0
        card.interval_days = 1
    else:
        if card.repetitions == 0:
            card.interval_days = 1
        elif card.repetitions == 1:
            card.interval_days = 6
        else:
            card.interval_days = round(card.interval_days * card.ease_factor)
        card.repetitions += 1

    card.ease_factor = max(1.3, card.ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    card.next_review_at = datetime.utcnow() + timedelta(days=card.interval_days)


@router.get("/due", response_model=List[FlashcardResponse])
def get_due_cards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.utcnow()
    return (
        db.query(Flashcard)
        .join(Flashcard.module)
        .join(Module.subject)
        .filter(Subject.owner_id == current_user.id)
        .filter(Flashcard.next_review_at <= now)
        .limit(50)
        .all()
    )


@router.post("/", response_model=FlashcardResponse, status_code=201)
def create_flashcard(body: FlashcardCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    card = Flashcard(**body.model_dump(), next_review_at=datetime.utcnow())
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@router.post("/review")
def review_flashcard(body: ReviewRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    card = (
        db.query(Flashcard)
        .join(Flashcard.module)
        .join(Module.subject)
        .filter(Subject.owner_id == current_user.id)
        .filter(Flashcard.id == body.flashcard_id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")

    _sm2_update(card, body.quality)
    db.commit()
    return {"next_review_at": card.next_review_at, "interval_days": card.interval_days}
