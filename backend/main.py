from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base

import app.models.user       # noqa: F401
import app.models.subject    # noqa: F401
import app.models.flashcard  # noqa: F401
import app.models.session    # noqa: F401
import app.models.otp        # noqa: F401

from app.api.routes import auth, subjects, flashcards, sessions, mastery, ai, upload


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"[startup] DB table creation skipped: {e}")
    yield


app = FastAPI(title="AuraIQ API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,       prefix="/api/auth",       tags=["auth"])
app.include_router(subjects.router,   prefix="/api/subjects",   tags=["subjects"])
app.include_router(flashcards.router, prefix="/api/flashcards", tags=["flashcards"])
app.include_router(sessions.router,   prefix="/api/sessions",   tags=["sessions"])
app.include_router(mastery.router,    prefix="/api/mastery",    tags=["mastery"])
app.include_router(ai.router,         prefix="/api/ai",         tags=["ai"])
app.include_router(upload.router,     prefix="/api/upload",     tags=["upload"])


@app.get("/health")
def health():
    return {"status": "ok"}
