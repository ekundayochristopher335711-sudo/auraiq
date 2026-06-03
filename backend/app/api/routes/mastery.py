from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models.subject import Subject, Module, Concept
from app.models.session import StudySession
from app.schemas.dashboard import DashboardResponse, DashboardStats, TopicScore, ForgettingForecast, PerformanceTrend

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subjects = db.query(Subject).filter(Subject.owner_id == current_user.id).all()

    mastery_pct = (
        sum(s.mastery_score for s in subjects) / len(subjects) * 100
        if subjects else 0.0
    )

    recent_sessions = (
        db.query(StudySession)
        .filter(StudySession.user_id == current_user.id)
        .order_by(StudySession.created_at.desc())
        .limit(8)
        .all()
    )

    exam_readiness = min(mastery_pct * 0.85 + (current_user.study_streak * 0.5), 100.0)
    last_accuracy = recent_sessions[0].accuracy if recent_sessions else None

    now = datetime.utcnow()

    # Count concepts due — scoped to this user's subjects
    concepts_due = (
        db.query(Concept)
        .join(Concept.module)
        .join(Module.subject)
        .filter(Subject.owner_id == current_user.id)
        .filter(Concept.next_review_at <= now + timedelta(days=1))
        .count()
    )

    topic_scores = [
        TopicScore(
            topic=s.title,
            score=s.mastery_score * 100,
            status="strong" if s.mastery_score >= 0.75 else "moderate" if s.mastery_score >= 0.45 else "weak",
        )
        for s in subjects
    ]

    # At-risk concepts — scoped to this user's subjects
    at_risk = (
        db.query(Concept)
        .join(Concept.module)
        .join(Module.subject)
        .filter(Subject.owner_id == current_user.id)
        .filter(
            Concept.next_review_at != None,
            Concept.next_review_at <= now + timedelta(hours=72),
        )
        .limit(3)
        .all()
    )

    forecasts = []
    for c in at_risk:
        if not c.next_review_at:
            continue
        hours_left = (c.next_review_at - now).total_seconds() / 3600
        urgency = "critical" if hours_left < 12 else "high" if hours_left < 36 else "medium"
        forecasts.append(ForgettingForecast(
            concept=c.title,
            subject=c.module.subject.title if c.module and c.module.subject else "Unknown",
            hours_until_forgotten=max(0, int(hours_left)),
            urgency=urgency,
        ))

    trend = [
        PerformanceTrend(
            date=s.created_at.strftime("%b %d"),
            score=round(s.accuracy * 100, 1),
        )
        for s in reversed(recent_sessions)
    ]

    return DashboardResponse(
        stats=DashboardStats(
            exam_readiness=round(exam_readiness, 1),
            study_streak=current_user.study_streak,
            mastery_percentage=round(mastery_pct, 1),
            daily_review_queue=concepts_due,
            cards_due_today=concepts_due,
            last_session_accuracy=last_accuracy,
            plan=current_user.plan.value,
        ),
        topic_scores=topic_scores,
        forgetting_forecasts=forecasts,
        performance_trend=trend,
    )
