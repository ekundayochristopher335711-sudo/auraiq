import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

function getAIClient() {
  if (process.env.GROQ_API_KEY) {
    return { client: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" }), model: "llama-3.3-70b-versatile" };
  }
  return { client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), model: "gpt-4o-mini" };
}

async function getUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Parse the AI's JSON, salvaging as many complete questions as possible if the
// response was truncated (the classic "Expected ',' or ']'" failure).
function parseQuestions(content: string): any[] {
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.questions)) return data.questions;
  } catch { /* fall through to repair */ }

  // Repair: grab the questions array and cut it off at the last complete object
  const start = content.indexOf("[");
  if (start !== -1) {
    let arr = content.slice(start);
    const lastObj = arr.lastIndexOf("}");
    if (lastObj !== -1) {
      arr = arr.slice(0, lastObj + 1) + "]";
      try {
        const salvaged = JSON.parse(arr);
        if (Array.isArray(salvaged) && salvaged.length > 0) return salvaged;
      } catch { /* give up */ }
    }
  }
  return [];
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  const { topic, difficulty = "medium", count = 5 } = await req.json();
  const { client, model } = getAIClient();

  const prompt = `Generate ${count} multiple choice questions about "${topic}" at ${difficulty} difficulty for a certification exam.
Return a JSON object with a "questions" array: {"questions": [{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "explanation": "..."}]}
Keep each explanation to 1-2 sentences. Return only valid JSON.`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8000,                              // enough for 20 full questions
      temperature: 0.7,
      response_format: { type: "json_object" },      // force valid JSON
    });
    const content = response.choices[0].message.content ?? "{}";
    const questions = parseQuestions(content);
    if (questions.length === 0) {
      return NextResponse.json({ detail: "AI could not generate questions. Please try again." }, { status: 500 });
    }
    return NextResponse.json(questions);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message ?? "AI error" }, { status: 500 });
  }
}
