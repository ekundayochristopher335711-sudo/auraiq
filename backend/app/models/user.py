from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class PlanType(str, enum.Enum):
    free       = "free"
    pro        = "pro"
    enterprise = "enterprise"


class User(Base):
    __tablename__ = "users"

    id               = Column(Integer, primary_key=True, index=True)
    email            = Column(String, unique=True, index=True, nullable=False)
    full_name        = Column(String, nullable=False)
    hashed_password  = Column(String, nullable=False)
    plan             = Column(Enum(PlanType), default=PlanType.free)
    is_active        = Column(Boolean, default=True)
    email_verified   = Column(Boolean, default=False, server_default="false")
    study_streak     = Column(Integer, default=0)
    last_active      = Column(DateTime(timezone=True), onupdate=func.now())
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    subjects       = relationship("Subject",      back_populates="owner", cascade="all, delete-orphan")
    study_sessions = relationship("StudySession", back_populates="user",  cascade="all, delete-orphan")
