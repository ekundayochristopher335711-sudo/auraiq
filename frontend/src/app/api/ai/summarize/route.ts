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

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  const { subject, content } = await req.json();
  if (!content || !String(content).trim()) {
    return NextResponse.json({ detail: "No notes found to summarize. Upload some study material first." }, { status: 400 });
  }

  const scopeLine = subject ? `the subject **${subject}**` : "these study notes";
  const truncated = String(content).slice(0, 14000);

  const prompt = `You are Recalro, an expert study tutor. Below are a student's study notes for ${scopeLine}, given as question–answer pairs extracted from their uploaded material.

Write a clear, well-structured revision summary that a student can read (or listen to) to revise the whole topic quickly. Guidelines:
- Open with a one-paragraph overview of what the topic covers.
- Then break the content into logical sections with **bold** headings.
- Under each heading, explain the key ideas in plain, connected prose (not just a list of the raw questions). Merge related points together.
- Use bullet points for lists of facts, and **bold** for the most important terms.
- End with a short "Key takeaways" section of 3–5 bullet points.
- Keep it accurate to the notes — do not invent facts that aren't supported by them.
- Write it so it flows naturally when read aloud.

Notes:
${truncated}`;

  const { client, model } = getAIClient();

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1600,
      temperature: 0.4,
    });
    return NextResponse.json({ summary: response.choices[0].message.content ?? "" });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message ?? "Summary failed" }, { status: 500 });
  }
}
