"""
Handles file text extraction (PDF / DOCX) and AI-powered
content structuring via OpenAI.
"""
import io
import json
import pdfplumber
import docx
import tiktoken
from openai import AsyncOpenAI
from app.core.config import settings

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
_enc = tiktoken.get_encoding("cl100k_base")

MAX_TOKENS_PER_CHUNK = 6000


def extract_text_from_pdf(data: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t.strip())
    return "\n\n".join(text_parts)


def extract_text_from_docx(data: bytes) -> str:
    doc = docx.Document(io.BytesIO(data))
    return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())


def chunk_text(text: str) -> list[str]:
    """Split text into chunks that fit within token limits."""
    tokens = _enc.encode(text)
    chunks = []
    for i in range(0, len(tokens), MAX_TOKENS_PER_CHUNK):
        chunk_tokens = tokens[i : i + MAX_TOKENS_PER_CHUNK]
        chunks.append(_enc.decode(chunk_tokens))
    return chunks


EXTRACTION_PROMPT = """You are an expert study material analyst. Analyze the following text and extract a structured study system.

Return ONLY valid JSON in this exact format:
{
  "subject_title": "string - concise subject title inferred from content",
  "subject_description": "string - 1-2 sentence description",
  "modules": [
    {
      "title": "string - module/topic name",
      "concepts": [
        {
          "title": "string - concept name",
          "explanation": "string - clear 2-3 sentence explanation"
        }
      ],
      "flashcards": [
        {
          "question": "string - exam-style question",
          "answer": "string - concise, accurate answer",
          "difficulty": "easy|medium|hard"
        }
      ]
    }
  ]
}

Rules:
- Extract 2-5 modules depending on content breadth
- Each module should have 2-6 key concepts
- Each module should have 3-8 flashcards (mix of difficulties)
- Questions should be exam-style (definitions, applications, calculations if relevant)
- Answers should be concise but complete

Text to analyze:
"""


async def extract_study_content(text: str) -> dict:
    """Send text to OpenAI and get structured study content back."""
    chunks = chunk_text(text)
    # Use first 2 chunks to stay within context — enough for most documents
    combined = "\n\n---\n\n".join(chunks[:2])

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": EXTRACTION_PROMPT + combined}
        ],
        response_format={"type": "json_object"},
        max_tokens=4000,
        temperature=0.3,
    )

    raw = response.choices[0].message.content
    return json.loads(raw)
