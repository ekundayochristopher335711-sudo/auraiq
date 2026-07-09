import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 60;

// Curated high-quality Google Neural2 voices across accents (Neural2 tier:
// 1M free chars/month, then $16/1M). Google has no Nigerian (en-NG) voice.
export const HD_VOICES = [
  { name: "en-US-Neural2-F", label: "US · Female",   lang: "en-US" },
  { name: "en-US-Neural2-D", label: "US · Male",     lang: "en-US" },
  { name: "en-GB-Neural2-A", label: "UK · Female",   lang: "en-GB" },
  { name: "en-GB-Neural2-B", label: "UK · Male",     lang: "en-GB" },
  { name: "en-AU-Neural2-A", label: "Australia",     lang: "en-AU" },
  { name: "en-IN-Neural2-A", label: "India",         lang: "en-IN" },
];

async function getUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Google caps each request at 5000 bytes — split on sentence boundaries.
function chunkText(text: string, max = 4200): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + s).length > max) {
      if (cur) chunks.push(cur);
      // A single sentence longer than max — hard-split it
      if (s.length > max) {
        for (let i = 0; i < s.length; i += max) chunks.push(s.slice(i, i + max));
        cur = "";
      } else {
        cur = s;
      }
    } else {
      cur += s;
    }
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}

// Lets the client know if HD voices are available + which ones
export async function GET() {
  return NextResponse.json({
    configured: Boolean(process.env.GOOGLE_TTS_API_KEY),
    voices: HD_VOICES,
  });
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) return NextResponse.json({ detail: "HD voice not configured", notConfigured: true }, { status: 503 });

  const { text, voice = "en-US-Neural2-F", speakingRate = 1 } = await req.json();
  if (!text || !String(text).trim()) return NextResponse.json({ detail: "No text provided" }, { status: 400 });

  const chosen = HD_VOICES.find((v) => v.name === voice) ?? HD_VOICES[0];
  const rate = Math.min(2, Math.max(0.5, Number(speakingRate) || 1));
  const chunks = chunkText(String(text).slice(0, 30000));   // safety cap ~30k chars

  try {
    const audios: string[] = [];
    for (const chunk of chunks) {
      const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: chunk },
          voice: { languageCode: chosen.lang, name: chosen.name },
          audioConfig: { audioEncoding: "MP3", speakingRate: rate },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ detail: `Google TTS error: ${errText.slice(0, 300)}` }, { status: 502 });
      }
      const data = await res.json();
      if (data.audioContent) audios.push(data.audioContent);
    }
    return NextResponse.json({ audios });   // array of base64 MP3 chunks, played in order
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message ?? "TTS failed" }, { status: 500 });
  }
}
