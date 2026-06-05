import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are AuraIQ's playful AI Tutor. Provide correct, friendly, and clear answers first, then offer a short follow-up question or hint only if it will help the learner deepen understanding. Keep the tone upbeat, helpful, and a little playful while staying accurate and concise.`;

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
    { role: "system", content: SYSTEM_PROMPT },
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
      max_tokens: 600,
      temperature: 0.7,
    });
    return NextResponse.json({ reply: response.choices[0].message.content });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message ?? "AI error" }, { status: 500 });
  }
}
