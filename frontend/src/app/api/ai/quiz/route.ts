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
    // Groq free tier allows 12k tokens/min per request (prompt + output).
    // ~8k chars of notes ≈ 2k tokens, leaving ample room for the questions.
    if (subj?.content && subj.content.trim().length > 80) {
      sourceNotes = subj.content.slice(0, 8000);
    } else {
      const { data } = await supabase
        .from("flashcards")
        .select("question, answer")
        .eq("subject_id", subjectId)
        .limit(300);
      if (data && data.length > 0) {
        sourceNotes = data.map((c) => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n").slice(0, 8000);
      }
    }
  }

  const jsonShape = `{"questions": [{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "explanation": "..."}]}`;

  const prompt = sourceNotes
    ? `You are an exam writer. Build a ${count}-question multiple-choice exam at ${difficulty} difficulty based on the student's study notes below.
Coverage rules:
- About HALF the questions must test facts, definitions and concepts stated DIRECTLY in the notes (cover as much of the material as possible, not just the start).
- The other half may test closely RELATED concepts and reasonable real-world applications or extensions of the same topics — stay strictly on-topic and never contradict the notes.
Format rules:
- Every question MUST have EXACTLY 4 options.
- The "answer" MUST be the single letter (A, B, C, or D) of the correct option.
- Do not copy the notes verbatim — rephrase into proper exam questions.
Study notes:
${sourceNotes}

Return a JSON object: ${jsonShape}
Keep each explanation to 1-2 sentences. Return only valid JSON.`
    : `Generate ${count} multiple choice questions about "${topic}" at ${difficulty} difficulty for a certification exam.
Every question must have exactly 4 options and the "answer" must be the letter (A, B, C, or D) of the correct option.
Return a JSON object with a "questions" array: ${jsonShape}
Keep each explanation to 1-2 sentences. Return only valid JSON.`;

  // Scale the output budget with question count so prompt + output stays
  // under Groq's free-tier 12k tokens-per-minute limit (was a flat 8000,
  // which caused "413 Request too large" on 20-question exams).
  const maxTokens = Math.min(6000, 300 * Math.max(1, Number(count) || 5) + 500);

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
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
    const msg = String(err?.message ?? "");
    if (/413|request too large|rate limit|429|TPM/i.test(msg)) {
      return NextResponse.json(
        { detail: "The AI is at its per-minute limit. Wait about a minute and try again — or generate a 10-question exam instead of 20." },
        { status: 429 }
      );
    }
    return NextResponse.json({ detail: msg || "AI error" }, { status: 500 });
  }
}
