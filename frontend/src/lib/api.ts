const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auraiq_token") : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 70000);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });
  } catch (error: any) {
    clearTimeout(timeout);
    if (controller.signal.aborted) {
      throw new Error("Request timed out after 70 seconds. The backend may still be waking up.");
    }
    if (error?.name === "TypeError") {
      throw new Error("Unable to reach the backend. Please check your network or wait a moment and try again.");
    }
    throw new Error(error?.message ?? "Unable to reach the backend.");
  }
  clearTimeout(timeout);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail ?? "Request failed");
  }
  return res.json();
}

export const api = {
  auth: {
    register: (email: string, full_name: string, password: string) =>
      request<{ email: string; access_token?: string; token_type?: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, full_name, password }),
      }),
    login: (email: string, password: string) =>
      request<{ access_token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<{ id: number; email: string; full_name: string; plan: string; study_streak: number }>("/api/auth/me"),
    verifyOTP: (email: string, code: string, purpose: string) =>
      request<{ access_token?: string; verified?: boolean; message?: string }>("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, code, purpose }),
      }),
    resendOTP: (email: string, purpose: string) =>
      request<{ message: string }>("/api/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email, purpose }),
      }),
    forgotPassword: (email: string) =>
      request<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    resetPassword: (email: string, code: string, new_password: string) =>
      request<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, code, new_password }),
      }),
  },
  dashboard: {
    get: () => request<DashboardData>("/api/mastery/dashboard"),
  },
  subjects: {
    list: () => request<Subject[]>("/api/subjects/"),
    create: (title: string, description?: string) =>
      request<Subject>("/api/subjects/", { method: "POST", body: JSON.stringify({ title, description }) }),
    delete: (id: number) => request<void>(`/api/subjects/${id}`, { method: "DELETE" }),
  },
  upload: {
    extract: async (file: File): Promise<{ preview: ExtractedContent; char_count: number }> => {
      const token = localStorage.getItem("auraiq_token");
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${BASE_URL}/api/upload/extract`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(err.detail ?? "Upload failed");
      }
      return res.json();
    },
    save: (preview: ExtractedContent) =>
      request<{ subject_id: number; title: string; modules: number; flashcards_created: number }>(
        "/api/upload/save",
        { method: "POST", body: JSON.stringify({ preview }) }
      ),
  },
  flashcards: {
    due: () => request<Flashcard[]>("/api/flashcards/due"),
    review: (flashcard_id: number, quality: number) =>
      request<{ next_review_at: string; interval_days: number }>("/api/flashcards/review", {
        method: "POST",
        body: JSON.stringify({ flashcard_id, quality }),
      }),
  },
  sessions: {
    create: (data: {
      subject_id?: number;
      duration_minutes: number;
      cards_reviewed: number;
      correct_answers: number;
      topic_scores?: Record<string, number>;
    }) => request<{ id: number; accuracy: number }>("/api/sessions/", { method: "POST", body: JSON.stringify(data) }),
  },
  ai: {
    chat: (message: string, subject: string, history: object[], image_base64?: string) =>
      request<{ reply: string }>("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message, subject, conversation_history: history, image_base64: image_base64 ?? "" }),
      }),
    generateQuiz: (topic: string, difficulty: string, count: number) =>
      request<QuizQuestion[]>("/api/ai/generate-quiz", {
        method: "POST",
        body: JSON.stringify({ topic, difficulty, count }),
      }),
  },
};

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

export interface ExtractedFlashcard {
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface ExtractedConcept {
  title: string;
  explanation: string;
}

export interface ExtractedModule {
  title: string;
  concepts: ExtractedConcept[];
  flashcards: ExtractedFlashcard[];
}

export interface ExtractedContent {
  subject_title: string;
  subject_description: string;
  modules: ExtractedModule[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}
