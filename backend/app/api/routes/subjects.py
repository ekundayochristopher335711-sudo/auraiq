from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models.subject import Subject, Module

router = APIRouter()


class SubjectCreate(BaseModel):
    title: str
    description: Optional[str] = None


class SubjectResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    mastery_score: float

    class Config:
        from_attributes = True


@router.get("/", response_model=List[SubjectResponse])
def list_subjects(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Subject).filter(Subject.owner_id == current_user.id).all()


@router.post("/", response_model=SubjectResponse, status_code=201)
def create_subject(body: SubjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = Subject(owner_id=current_user.id, title=body.title, description=body.description)
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject


@router.delete("/{subject_id}", status_code=204)
def delete_subject(subject_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == subject_id, Subject.owner_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(subject)
    db.commit()
