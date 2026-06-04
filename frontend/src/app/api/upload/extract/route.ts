import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
import mammoth from "mammoth";

export const runtime = "nodejs";

async function getUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function getAIClient() {
  if (process.env.GROQ_API_KEY) {
    return { client: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" }), model: "llama-3.3-70b-versatile" };
  }
  return { client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), model: "gpt-4o-mini" };
}

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.name.endsWith(".pdf")) {
    const result = await pdfParse(buffer);
    return result.text;
  }
  if (file.name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  return buffer.toString("utf-8");
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ detail: "No file provided" }, { status: 400 });

  let rawText: string;
  try {
    rawText = await extractText(file);
  } catch {
    return NextResponse.json({ detail: "Could not read file" }, { status: 400 });
  }

  if (rawText.trim().length < 100) {
    return NextResponse.json({ detail: "Could not extract enough text from this file." }, { status: 400 });
  }

  const truncated = rawText.slice(0, 12000);
  const { client, model } = getAIClient();

  const prompt = `You are an expert study material extractor. Given the text below, extract structured study content.

Return ONLY valid JSON in this exact format:
{
  "subject_title": "Short subject name",
  "subject_description": "One sentence description",
  "modules": [
    {
      "title": "Module name",
      "concepts": [
        {"title": "Concept name", "explanation": "Clear explanation in 1-2 sentences"}
      ],
      "flashcards": [
        {"question": "Question?", "answer": "Answer", "difficulty": "easy|medium|hard"}
      ]
    }
  ]
}

Rules:
- Create 2-4 modules
- Each module: 3-5 concepts, 3-5 flashcards
- Flashcards must be specific and testable
- difficulty: easy (recall), medium (understand), hard (apply/analyze)

Text to extract from:
${truncated}`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 3000,
      temperature: 0.3,
    });

    const content = response.choices[0].message.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ detail: "AI could not extract content" }, { status: 500 });

    const preview = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ preview, char_count: rawText.length });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message ?? "Extraction failed" }, { status: 500 });
  }
}
