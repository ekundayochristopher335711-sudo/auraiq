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

  const { preview } = await req.json();
  if (!preview) return NextResponse.json({ detail: "No content provided" }, { status: 400 });

  // Create subject
  const { data: subject, error: subjectError } = await supabase
    .from("subjects")
    .insert({ title: preview.subject_title, description: preview.subject_description, user_id: user.id })
    .select()
    .single();

  if (subjectError) return NextResponse.json({ detail: subjectError.message }, { status: 500 });

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

  return NextResponse.json({
    subject_id: subject.id,
    title: subject.title,
    modules: preview.modules?.length ?? 0,
    flashcards_created,
  });
}
