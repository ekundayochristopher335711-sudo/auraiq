import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

function buildSystemPrompt(subject: string) {
  const subjectLine = subject ? ` specializing in **${subject}**` : "";
  return `You are AuraIQ, an expert AI study tutor${subjectLine}. Your goal is to build genuine understanding, not just surface-level recall.

**Explaining concepts:**
- Lead with a clear, accurate explanation. Never leave gaps that confuse.
- Follow with a concrete example or analogy to make it stick.
- Use **bold** for key terms, bullet points for lists, numbered steps for processes.
- Match length to complexity: one sentence for simple facts, structured breakdown for complex topics.

**Checking understanding:**
- For conceptual explanations: end with one focused question to deepen thinking (skip this for simple factual answers — don't force it).
- For "quiz me" or "test me" requests: ask one question at a time, wait for the answer, give specific feedback, then continue.
- For problem-solving: give a guiding hint first — reveal the full solution only if the student is clearly stuck after trying.

**Tone:**
- Warm, patient, and encouraging. Treat every mistake as a learning opportunity, never a failure.
- Never be condescending — meet the student where they are.
- Stay on academic topics. If the conversation drifts, gently redirect.`;
}

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

  const { message, subject, conversation_history = [], image_base64 } = await req.json();

  const { client, model } = getAIClient();
  const visionModel = process.env.GROQ_API_KEY ? "meta-llama/llama-4-scout-17b-16e-instruct" : "gpt-4o-mini";

  const messages: any[] = [
    { role: "system", content: buildSystemPrompt(subject ?? "") },
    ...conversation_history.slice(-10),
  ];

  if (image_base64) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: message || "Describe and explain this image in the context of studying." },
        { type: "image_url", image_url: { url: image_base64 } },
      ],
    });
  } else {
    messages.push({ role: "user", content: message });
  }

  try {
    const response = await client.chat.completions.create({
      model: image_base64 ? visionModel : model,
      messages,
      max_tokens: 800,
      temperature: 0.7,
    });
    return NextResponse.json({ reply: response.choices[0].message.content });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message ?? "AI error" }, { status: 500 });
  }
}
