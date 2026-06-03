from pydantic import BaseModel
from typing import List, Optional


class TopicScore(BaseModel):
    topic: str
    score: float
    status: str


class ForgettingForecast(BaseModel):
    concept: str
    subject: str
    hours_until_forgotten: int
    urgency: str


class DashboardStats(BaseModel):
    exam_readiness: float
    study_streak: int
    mastery_percentage: float
    daily_review_queue: int
    cards_due_today: int
    last_session_accuracy: Optional[float] = None
    plan: str


class PerformanceTrend(BaseModel):
    date: str
    score: float


class DashboardResponse(BaseModel):
    stats: DashboardStats
    topic_scores: List[TopicScore]
    forgetting_forecasts: List[ForgettingForecast]
    performance_trend: List[PerformanceTrend]
