from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class DifficultyLevel(str, enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=False)
    question = Column(String, nullable=False)
    answer = Column(String, nullable=False)
    difficulty = Column(Enum(DifficultyLevel), default=DifficultyLevel.medium)
    ease_factor = Column(Float, default=2.5)      # SM-2 spaced repetition
    interval_days = Column(Float, default=1.0)
    repetitions = Column(Integer, default=0)
    next_review_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    module = relationship("Module", back_populates="flashcards")
