import { supabase } from "./supabaseClient";
import * as db from "./db";

// ── Auth helper for Next.js API routes ────────────────────────────────────────
async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await authHeaders();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 70000);
  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...headers, ...options.headers },
    });
  } catch (err: any) {
    clearTimeout(timeout);
    throw new Error("Server is waking up — please wait a moment and try again.");
  }
  clearTimeout(timeout);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail ?? "Request failed");
  }
  return res.json();
}

// ── Public API ────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    me: async () => {
      const profile = await db.getProfile();
      return {
        id: profile.id,
        email: profile.email ?? "",
        full_name: profile.full_name ?? "",
        plan: profile.plan ?? "free",
        study_streak: profile.study_streak ?? 0,
      };
    },
    register: async () => {},
    login: async () => {},
    forgotPassword: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
    },
    resetPassword: async (_email: string, _code: string, newPassword: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
    },
    verifyOTP: async (email: string, code: string, purpose: string) => {
      const type = purpose === "verify_email" ? "signup" : "recovery";
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type });
      if (error) throw new Error(error.message);
      return { access_token: data.session?.access_token, verified: true };
    },
    resendOTP: async (email: string, _purpose: string) => {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw new Error(error.message);
    },
  },

  dashboard: {
    get: () => db.getDashboard(),
  },

  subjects: {
    list: () => db.getSubjects(),
    create: (title: string, description?: string) => db.createSubject(title, description),
    delete: (id: number) => db.deleteSubject(id),
  },

  flashcards: {
    due: () => db.getDueFlashcards(),
    review: (flashcard_id: number, quality: number) => db.reviewFlashcard(flashcard_id, quality),
  },

  sessions: {
    create: (data: { subject_id?: number; duration_minutes: number; cards_reviewed: number; correct_answers: number }) =>
      db.createSession(data),
  },

  upload: {
    extract: async (file: File): Promise<{ preview: ExtractedContent; char_count: number }> => {
      const headers = await authHeaders();
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload/extract", {
        method: "POST",
        headers: headers as Record<string, string>,
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail ?? "Upload failed");
      }
      return res.json();
    },
    save: (preview: ExtractedContent) =>
      apiRequest<{ subject_id: number; title: string; modules: number; flashcards_created: number }>(
        "/api/upload/save",
        { method: "POST", body: JSON.stringify({ preview }) }
      ),
  },

  ai: {
    chat: (message: string, subject: string, history: object[], image_base64?: string) =>
      apiRequest<{ reply: string }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message, subject, conversation_history: history, image_base64: image_base64 ?? "" }),
      }),
    generateQuiz: (topic: string, difficulty: string, count: number) =>
      apiRequest<QuizQuestion[]>("/api/ai/quiz", {
        method: "POST",
        body: JSON.stringify({ topic, difficulty, count }),
      }),
  },
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface DashboardData {
  stats: {
    exam_readiness: number;
    study_streak: number;
    mastery_percentage: number;
    daily_review_queue: number;
    cards_due_today: number;
    last_session_accuracy: number | null;
    plan: string;
  };
  topic_scores: { topic: string; score: number; status: string }[];
  forgetting_forecasts: { concept: string; subject: string; hours_until_forgotten: number; urgency: string }[];
  performance_trend: { date: string; score: number }[];
}

export interface Flashcard {
  id: number;
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  next_review_at: string | null;
}

export interface Subject {
  id: number;
  title: string;
  description: string | null;
  mastery_score: number;
}

export interface ExtractedFlashcard { question: string; answer: string; difficulty: "easy" | "medium" | "hard"; }
export interface ExtractedConcept { title: string; explanation: string; }
export interface ExtractedModule { title: string; concepts: ExtractedConcept[]; flashcards: ExtractedFlashcard[]; }
export interface ExtractedContent { subject_title: string; subject_description: string; modules: ExtractedModule[]; }
export interface QuizQuestion { question: string; options: string[]; answer: string; explanation: string; }
