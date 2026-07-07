import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function getAuthenticatedClient(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return { client: null, user: null };
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return { client: supabase, user };
}

export async function POST(req: NextRequest) {
  const { client: supabase, user } = await getAuthenticatedClient(req);
  if (!supabase || !user) return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });

  const { preview, subjectId, content } = await req.json();
  if (!preview) return NextResponse.json({ detail: "No content provided" }, { status: 400 });

  const MAX_CONTENT = 60000;   // cap accumulated source text per subject (~60 KB)
  const incoming = typeof content === "string" ? content.trim() : "";

  let subject: { id: number; title: string };

  if (subjectId) {
    // Append to an existing subject (RLS ensures it belongs to this user)
    const { data, error } = await supabase
      .from("subjects")
      .select("id, title, content")
      .eq("id", subjectId)
      .single();
    if (error || !data) return NextResponse.json({ detail: "Subject not found" }, { status: 404 });
    subject = data;

    if (incoming) {
      const merged = [(data as any).content ?? "", incoming].filter(Boolean).join("\n\n").slice(0, MAX_CONTENT);
      await supabase.from("subjects").update({ content: merged }).eq("id", subjectId);
    }
  } else {
    // Create a new subject from the extracted content
    const { data, error: subjectError } = await supabase
      .from("subjects")
      .insert({
        title: preview.subject_title,
        description: preview.subject_description,
        user_id: user.id,
        content: incoming.slice(0, MAX_CONTENT) || null,
      })
      .select()
      .single();
    if (subjectError || !data) return NextResponse.json({ detail: subjectError?.message ?? "Could not create subject" }, { status: 500 });
    subject = data;
  }

  // Insert all flashcards from all modules
  const flashcards: any[] = [];
  for (const module of preview.modules ?? []) {
    for (const card of module.flashcards ?? []) {
      flashcards.push({
        subject_id: subject.id,
        user_id: user.id,
        question: card.question,
        answer: card.answer,
        difficulty: card.difficulty ?? "medium",
      });
    }
  }

  let flashcards_created = 0;
  if (flashcards.length > 0) {
    const { error: flashError } = await supabase.from("flashcards").insert(flashcards);
    if (!flashError) flashcards_created = flashcards.length;
  }

  // Increment study streak (best-effort)
  try { await supabase.rpc("increment_streak", { uid: user.id }); } catch { }

  return NextResponse.json({
    subject_id: subject.id,
    title: subject.title,
    modules: preview.modules?.length ?? 0,
    flashcards_created,
  });
}
