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

// Full extracted document text stored for a subject ("" if none / column absent)
export async function getSubjectContent(id: number): Promise<string> {
  try {
    const { data } = await supabase.from("subjects").select("content").eq("id", id).single();
    return ((data as any)?.content as string) ?? "";
  } catch {
    return "";
  }
}

// ── Summaries ─────────────────────────────────────────────────────────────────
export async function getSummary(subjectId: number | null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  let query = supabase
    .from("summaries")
    .select("*")
    .eq("user_id", user.id)
    .limit(1);
  query = subjectId === null ? query.is("subject_id", null) : query.eq("subject_id", subjectId);
  const { data, error } = await query;
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function saveSummary(subjectId: number | null, scopeLabel: string, content: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // One saved summary per scope — update if it exists, else insert
  const existing = await getSummary(subjectId);
  if (existing) {
    const { data, error } = await supabase
      .from("summaries")
      .update({ content, scope_label: scopeLabel, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("summaries")
    .insert({ user_id: user.id, subject_id: subjectId, scope_label: scopeLabel, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSummary(subjectId: number | null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  let query = supabase.from("summaries").delete().eq("user_id", user.id);
  query = subjectId === null ? query.is("subject_id", null) : query.eq("subject_id", subjectId);
  const { error } = await query;
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

export async function getAllFlashcards() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("flashcards")
    .select("question, answer, subjects(title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
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
    new_interval = 1;                                   // failed — relearn tomorrow
  } else if (interval_days <= 1) {
    new_interval = 6;                                   // first successful review graduates to 6 days
  } else {
    new_interval = Math.round(interval_days * new_ef);  // subsequent reviews grow by ease factor
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

// ── AI Tutor conversations ──────────────────────────────────────────────────
export interface ChatMessage { role: "user" | "assistant"; content: string; imageUrl?: string }

export async function listConversations(subject?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  let q = supabase
    .from("conversations")
    .select("id, subject, title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (subject) q = q.eq("subject", subject);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getConversation(id: number) {
  const { data, error } = await supabase.from("conversations").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createConversation(subject: string, title: string, messages: ChatMessage[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, subject, title, messages })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as number;
}

export async function updateConversation(id: number, messages: ChatMessage[]) {
  const { error } = await supabase
    .from("conversations")
    .update({ messages, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteConversation(id: number) {
  const { error } = await supabase.from("conversations").delete().eq("id", id);
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

  const nowISO = new Date().toISOString();
  const [profileRes, sessionsRes, cardsRes, subjectsRes, dueRes] = await Promise.all([
    supabase.from("profiles").select("study_streak, plan").eq("id", user.id).single(),
    supabase.from("study_sessions").select("accuracy, created_at, cards_reviewed, correct_answers").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    // Lean aggregate query — only the 3 small fields needed for mastery/due counts
    supabase.from("flashcards").select("subject_id, interval_days, next_review_at").eq("user_id", user.id),
    supabase.from("subjects").select("id, title, mastery_score").eq("user_id", user.id).order("mastery_score", { ascending: true }),
    // Forecast query — just the 5 most-overdue cards with their text
    supabase.from("flashcards").select("question, next_review_at, subjects(title)").eq("user_id", user.id).lte("next_review_at", nowISO).order("next_review_at", { ascending: true }).limit(5),
  ]);

  const profile = profileRes.data ?? { study_streak: 0, plan: "free" };
  const sessions = sessionsRes.data ?? [];
  const cards = cardsRes.data ?? [];
  const subjectsList = subjectsRes.data ?? [];
  const dueCards = dueRes.data ?? [];

  const now = new Date();
  const cards_due_today = cards.filter((c) => c.next_review_at && new Date(c.next_review_at) <= now).length;
  const last_session_accuracy = sessions[0]?.accuracy ?? null;

  const performance_trend = sessions.slice(0, 30).reverse().map((s) => ({
    date: new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: Math.round((s.accuracy ?? 0) * 100),
  }));

  // Per-subject mastery from spaced-repetition progress: a card's review interval
  // grows as it's remembered (~21-day interval ≈ mastered). This makes mastery and
  // exam readiness reflect real progress and drop when a subject is deleted.
  const agg = new Map<number, { sum: number; count: number }>();
  for (const c of cards as any[]) {
    if (c.subject_id == null) continue;
    const m = Math.max(0, Math.min(1, (c.interval_days ?? 0) / 21));
    const e = agg.get(c.subject_id) ?? { sum: 0, count: 0 };
    e.sum += m; e.count += 1;
    agg.set(c.subject_id, e);
  }
  const subjectMastery = (id: number) => {
    const e = agg.get(id);
    return e && e.count > 0 ? e.sum / e.count : 0;
  };

  const avg_mastery = subjectsList.length > 0
    ? subjectsList.reduce((sum, s) => sum + subjectMastery(s.id), 0) / subjectsList.length
    : 0;

  // Keep the stored per-subject mastery in sync (best-effort, non-blocking) so the
  // Subjects list, Top Subjects and Reports match the dashboard.
  for (const s of subjectsList) {
    const m = subjectMastery(s.id);
    if (Math.abs((s.mastery_score ?? 0) - m) > 0.005) {
      supabase.from("subjects").update({ mastery_score: m }).eq("id", s.id).then(() => {});
    }
  }

  const topic_scores = subjectsList.map((s) => {
    const score = Math.round(subjectMastery(s.id) * 100);
    return {
      topic: s.title,
      score,
      status: score >= 75 ? "strong" : score >= 45 ? "moderate" : "weak",
    };
  });

  // Forgetting forecast: the 5 most-overdue cards (from the dedicated lean query).
  // Once the student reviews them they drop off the list.
  const forgetting_forecasts = dueCards.map((c) => {
    const due = new Date(c.next_review_at!);
    const isOverdue = due <= now;
    const hoursLeft = isOverdue ? 0 : Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60));
    return {
      concept: ((c as any).question ?? "Flashcard").slice(0, 55),
      subject: ((c as any).subjects as any)?.title ?? "General",
      hours_until_forgotten: hoursLeft,
      urgency: isOverdue ? "critical" : hoursLeft < 4 ? "high" : "medium",
    };
  });

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
    topic_scores,
    forgetting_forecasts,
    performance_trend,
  };
}
