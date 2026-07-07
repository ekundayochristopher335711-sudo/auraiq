import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

function getAIClient() {
  if (process.env.GROQ_API_KEY) {
    return { client: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" }), model: "llama-3.3-70b-versatile" };
  }
  return { client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), model: "gpt-4o-mini" };
}

async function getAuth(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { user: null, supabase: null };
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
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
  const { user, supabase } = await getAuth(req);
  if (!user || !supabase) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  const { topic, difficulty = "medium", count = 5, subjectId } = await req.json();
  const { client, model } = getAIClient();

  // Build the exam from the student's OWN uploaded material. Prefer the full
  // extracted document text (fullest coverage); fall back to their flashcards.
  let sourceNotes = "";
  if (subjectId) {
    const { data: subj } = await supabase
      .from("subjects")
      .select("content")
      .eq("id", subjectId)
      .single();
    if (subj?.content && subj.content.trim().length > 80) {
      sourceNotes = subj.content.slice(0, 12000);
    } else {
      const { data } = await supabase
        .from("flashcards")
        .select("question, answer")
        .eq("subject_id", subjectId)
        .limit(200);
      if (data && data.length > 0) {
        sourceNotes = data.map((c) => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n").slice(0, 12000);
      }
    }
  }

  const jsonShape = `{"questions": [{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "explanation": "..."}]}`;

  const prompt = sourceNotes
    ? `You are an exam writer. Using ONLY the student's study notes below, write ${count} multiple choice questions (4 options each) at ${difficulty} difficulty that test understanding of THIS material. Do not introduce facts that are not supported by the notes. Vary the questions — do not simply copy the notes verbatim.
Study notes:
${sourceNotes}

Return a JSON object: ${jsonShape}
Keep each explanation to 1-2 sentences. Return only valid JSON.`
    : `Generate ${count} multiple choice questions about "${topic}" at ${difficulty} difficulty for a certification exam.
Return a JSON object with a "questions" array: ${jsonShape}
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
