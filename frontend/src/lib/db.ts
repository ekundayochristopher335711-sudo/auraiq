import { supabase } from "./supabaseClient";

// ── Profiles ──────────────────────────────────────────────────────────────────
export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return { ...data, id: user.id, email: user.email };
}

// ── Subjects ──────────────────────────────────────────────────────────────────
export async function getSubjects() {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createSubject(title: string, description?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("subjects")
    .insert({ title, description, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubject(id: number) {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) throw error;
}

// ── Flashcards ────────────────────────────────────────────────────────────────
export async function getSubjectFlashcards(subjectId: number) {
  const { data, error } = await supabase
    .from("flashcards")
    .select("*")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function deleteFlashcard(id: number) {
  const { error } = await supabase.from("flashcards").delete().eq("id", id);
  if (error) throw error;
}

export async function getDueFlashcards() {
  const { data, error } = await supabase
    .from("flashcards")
    .select("*, subjects(title)")
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function reviewFlashcard(flashcard_id: number, quality: number) {
  // SM-2 spaced repetition algorithm
  const { data: card, error } = await supabase
    .from("flashcards")
    .select("interval_days, ease_factor")
    .eq("id", flashcard_id)
    .single();
  if (error) throw error;

  let { interval_days, ease_factor } = card;
  const new_ef = Math.max(1.3, ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  let new_interval: number;
  if (quality < 3) {
    new_interval = 1;
  } else if (interval_days <= 1) {
    new_interval = 1;
  } else if (interval_days === 1) {
    new_interval = 6;
  } else {
    new_interval = Math.round(interval_days * new_ef);
  }

  const next_review = new Date();
  next_review.setDate(next_review.getDate() + new_interval);

  const { error: updateError } = await supabase
    .from("flashcards")
    .update({ interval_days: new_interval, ease_factor: new_ef, next_review_at: next_review.toISOString() })
    .eq("id", flashcard_id);
  if (updateError) throw updateError;

  return { next_review_at: next_review.toISOString(), interval_days: new_interval };
}

export async function insertFlashcards(cards: { subject_id: number; question: string; answer: string; difficulty: string }[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const rows = cards.map((c) => ({ ...c, user_id: user.id }));
  const { error } = await supabase.from("flashcards").insert(rows);
  if (error) throw error;
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export async function createSession(session: {
  subject_id?: number;
  duration_minutes: number;
  cards_reviewed: number;
  correct_answers: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const accuracy = session.cards_reviewed > 0
    ? session.correct_answers / session.cards_reviewed
    : 0;
  const { data, error } = await supabase
    .from("study_sessions")
    .insert({ ...session, user_id: user.id, accuracy })
    .select()
    .single();
  if (error) throw error;

  // Update study streak on profile
  try { await supabase.rpc("increment_streak", { uid: user.id }); } catch { }

  return { id: data.id, accuracy };
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export async function getDashboard() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [profileRes, sessionsRes, cardsRes] = await Promise.all([
    supabase.from("profiles").select("study_streak, plan").eq("id", user.id).single(),
    supabase.from("study_sessions").select("accuracy, created_at, cards_reviewed, correct_answers").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("flashcards").select("id, next_review_at, difficulty, subjects(title)").eq("user_id", user.id),
  ]);

  const profile = profileRes.data ?? { study_streak: 0, plan: "free" };
  const sessions = sessionsRes.data ?? [];
  const cards = cardsRes.data ?? [];

  const now = new Date();
  const cards_due_today = cards.filter((c) => c.next_review_at && new Date(c.next_review_at) <= now).length;
  const last_session_accuracy = sessions[0]?.accuracy ?? null;
  const avg_mastery = sessions.length > 0
    ? sessions.reduce((s, r) => s + (r.accuracy ?? 0), 0) / sessions.length
    : 0;

  const performance_trend = sessions.slice(0, 14).reverse().map((s) => ({
    date: new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: Math.round((s.accuracy ?? 0) * 100),
  }));

  return {
    stats: {
      exam_readiness: Math.round(avg_mastery * 100),
      study_streak: profile.study_streak ?? 0,
      mastery_percentage: Math.round(avg_mastery * 100),
      daily_review_queue: cards_due_today,
      cards_due_today,
      last_session_accuracy,
      plan: profile.plan ?? "free",
    },
    topic_scores: [],
    forgetting_forecasts: [],
    performance_trend,
  };
}
