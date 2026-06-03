from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI
from app.core.config import settings
from app.api.routes.auth import get_current_user
from app.models.user import User

router = APIRouter()
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are AuraIQ's Socratic AI Tutor. Your role is to help learners
deeply understand certification exam material through the Socratic method — ask guiding
questions, never give direct answers unless the learner is truly stuck. Always break
complex concepts into digestible pieces and relate them to real-world scenarios."""


class ChatRequest(BaseModel):
    message: str
    subject: str = ""
    conversation_history: list = []


class QuizRequest(BaseModel):
    topic: str
    difficulty: str = "medium"
    count: int = 5


@router.post("/chat")
async def socratic_chat(body: ChatRequest, current_user: User = Depends(get_current_user)):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(body.conversation_history[-10:])
    messages.append({"role": "user", "content": body.message})

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=600,
        temperature=0.7,
    )
    return {"reply": response.choices[0].message.content}


@router.post("/generate-quiz")
async def generate_quiz(body: QuizRequest, current_user: User = Depends(get_current_user)):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")

    prompt = f"""Generate {body.count} multiple choice questions about "{body.topic}"
at {body.difficulty} difficulty for a certification exam.
Return JSON array: [{{"question": "...", "options": ["A", "B", "C", "D"], "answer": "A", "explanation": "..."}}]
Only return the JSON array, nothing else."""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        max_tokens=2000,
    )
    import json
    content = response.choices[0].message.content
    data = json.loads(content)
    return data if isinstance(data, list) else data.get("questions", data)


@router.post("/explain")
async def explain_concept(topic: str, current_user: User = Depends(get_current_user)):
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{
            "role": "user",
            "content": f"Explain '{topic}' in simple terms for a certification exam student. Include: core definition, key formula/rule if any, a real-world analogy, and one common exam trap. Be concise."
        }],
        max_tokens=400,
    )
    return {"explanation": response.choices[0].message.content}
