from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models.session import StudySession

router = APIRouter()


class SessionCreate(BaseModel):
    subject_id: Optional[int] = None
    duration_minutes: int
    cards_reviewed: int
    correct_answers: int
    topic_scores: dict = {}


def _update_streak(user: User) -> None:
    """Increment streak for consecutive days; reset if a day was missed."""
    today = datetime.utcnow().date()
    if user.last_active is None:
        user.study_streak = 1
    else:
        last_date = user.last_active.date()
        if last_date == today:
            pass  # already studied today — don't double-count
        elif last_date == today - timedelta(days=1):
            user.study_streak += 1  # consecutive day
        else:
            user.study_streak = 1   # streak broken — restart
    user.last_active = datetime.utcnow()


@router.post("/", status_code=201)
def create_session(body: SessionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accuracy = body.correct_answers / body.cards_reviewed if body.cards_reviewed > 0 else 0.0
    session = StudySession(
        user_id=current_user.id,
        subject_id=body.subject_id,
        duration_minutes=body.duration_minutes,
        cards_reviewed=body.cards_reviewed,
        correct_answers=body.correct_answers,
        accuracy=accuracy,
        topic_scores=body.topic_scores,
    )
    db.add(session)
    _update_streak(current_user)
    db.commit()
    return {"id": session.id, "accuracy": accuracy}
