"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api, Subject } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/context/ToastContext";
import { Timer, Flag, ChevronLeft, ChevronRight, Play, CheckCircle, XCircle, BookOpen, Loader2, Brain, Sparkles, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "setup" | "exam" | "results";
type Difficulty = "easy" | "medium" | "hard";

interface Question {
  id: number;
  topic: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ExamSimPage() {
  const { toast } = useToast();
  const [phase, setPhase]         = useState<Phase>("setup");
  const [qCount, setQCount]       = useState<10 | 25 | 50>(10);
  const [timed, setTimed]         = useState(true);
  const [timeMins, setTimeMins]   = useState(30);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError]     = useState("");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers]     = useState<Record<number, number>>({});
  const [flagged, setFlagged]     = useState<Set<number>>(new Set());
  const [current, setCurrent]     = useState(0);
  const [timeLeft, setTimeLeft]   = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [subjects, setSubjects]   = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.subjects.list()
      .then((list) => { setSubjects(list); if (list.length > 0) setSelectedSubject(list[0]); })
      .catch(() => setSubjects([]))
      .finally(() => setLoadingSubjects(false));
  }, []);

  // Load any previously generated exam for this subject (retakeable offline)
  const [savedExam, setSavedExam] = useState<Question[] | null>(null);
  useEffect(() => {
    if (!selectedSubject) { setSavedExam(null); return; }
    try {
      const raw = localStorage.getItem(`recalro_exam_${selectedSubject.id}`);
      setSavedExam(raw ? JSON.parse(raw) : null);
    } catch { setSavedExam(null); }
  }, [selectedSubject]);

  // Countdown
  useEffect(() => {
    if (phase !== "exam" || !timed) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, timed]);

  useEffect(() => {
    if (phase === "exam" && timed && timeLeft === 0 && questions.length > 0) {
      submitExam();   // time's up — grade and record like a manual submit
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, timed, questions.length]);

  const launchExam = (qs: Question[]) => {
    setQuestions(qs);
    setAnswers({});
    setFlagged(new Set());
    setCurrent(0);
    setTimeLeft(timeMins * 60);
    setShowReview(false);
    setPhase("exam");
  };

  const startAIExam = async () => {
    if (!selectedSubject) return;
    setGenerating(true);
    setAiError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const count = Math.min(qCount, 20); // cap AI questions at 20

      const res = await fetch("/api/ai/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ topic: selectedSubject.title, difficulty, count, subjectId: selectedSubject.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `Request failed (${res.status})`);
      }

      const raw: Array<{ question: string; options: string[]; answer: string; explanation: string }> = await res.json();

      if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error("AI returned no questions. Try again.");
      }

      const qs: Question[] = raw
        .map((item, idx) => {
          // Normalise options — always an array of clean strings (strip "A. " prefixes)
          const rawOpts = Array.isArray(item.options) ? item.options : [];
          const options = rawOpts
            .map((o) => String(o ?? "").replace(/^\s*[A-D][.)]\s*/i, "").trim())
            .filter(Boolean);

          // The correct answer may be a letter ("A") or the full option text
          let correct = 0;
          const ans = String(item.answer ?? "").trim();
          if (/^[A-D]$/i.test(ans)) {
            correct = ans.toUpperCase().charCodeAt(0) - 65;
          } else {
            const cleaned = ans.replace(/^\s*[A-D][.)]\s*/i, "").trim().toLowerCase();
            const found = options.findIndex((o) => o.toLowerCase() === cleaned);
            if (found >= 0) correct = found;
          }
          if (correct < 0 || correct >= options.length) correct = 0;

          return {
            id: idx + 1,
            topic: selectedSubject.title,
            question: String(item.question ?? "").trim(),
            options,
            correct,
            explanation: String(item.explanation ?? "").trim(),
          };
        })
        // Drop malformed questions (no text or fewer than 2 options) so options always render
        .filter((q) => q.question && q.options.length >= 2);

      if (qs.length === 0) {
        throw new Error("The AI returned malformed questions. Please try again.");
      }

      // Save the generated exam so it can be retaken later — even offline
      try { localStorage.setItem(`recalro_exam_${selectedSubject.id}`, JSON.stringify(qs)); } catch { /* storage full */ }
      setSavedExam(qs);

      toast.success(`${qs.length} questions generated for "${selectedSubject.title}"`);
      launchExam(qs);
    } catch (err: any) {
      setAiError(err.message ?? "Failed to generate questions.");
    } finally {
      setGenerating(false);
    }
  };

  const submitExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    // Record the exam as a study session (best-effort) so it feeds the
    // dashboard's accuracy trend, history, and streak.
    const correct = questions.filter((q, i) => answers[i] === q.correct).length;
    const elapsedMins = timed
      ? Math.max(1, Math.round((timeMins * 60 - timeLeft) / 60))
      : Math.max(1, Math.round(questions.length / 2));
    api.sessions.create({
      subject_id: selectedSubject?.id,
      duration_minutes: elapsedMins,
      cards_reviewed: questions.length,
      correct_answers: correct,
    }).catch(() => {});
    setPhase("results");
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(current)) next.delete(current); else next.add(current);
      return next;
    });
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const score    = questions.filter((q, i) => answers[i] === q.correct).length;
  const total    = questions.length;
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed   = accuracy >= 70;

  const domains = Array.from(new Set(questions.map((q) => q.topic))).map((topic) => {
    const indices = questions.reduce<number[]>((acc, q, i) => { if (q.topic === topic) acc.push(i); return acc; }, []);
    const topicCorrect = indices.filter((i) => answers[i] === questions[i].correct).length;
    return { topic, correct: topicCorrect, total: indices.length, pct: Math.round((topicCorrect / indices.length) * 100) };
  });

  // ── Setup ──────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="p-4 sm:p-6 max-w-2xl space-y-4">
        <div>
          <h1 className="text-xl font-bold text-white">Exam Simulator</h1>
          <p className="text-sm text-gray-500 mt-0.5">Practice under real exam conditions</p>
        </div>

        <div className="rounded-2xl bg-[#141414] border border-white/8 p-5 space-y-5">
          {/* Subject picker (AI mode only) */}
          {(
            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">Select Subject</p>
              {loadingSubjects ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 size={14} className="animate-spin" /> Loading subjects...
                </div>
              ) : subjects.length === 0 ? (
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 text-center">
                  <p className="text-sm text-amber-400 mb-2">No subjects yet</p>
                  <Link href="/subjects" className="text-xs text-violet-400 hover:text-violet-300 underline">
                    Create a subject first →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pr-1">
                  {subjects.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSubject(s)}
                      className={cn(
                        "w-full text-left flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all",
                        selectedSubject?.id === s.id
                          ? "bg-violet-600/15 border-violet-500/40 text-violet-300"
                          : "bg-white/3 border-white/8 text-gray-400 hover:border-white/15"
                      )}
                    >
                      <Brain size={13} className="shrink-0" />
                      <span className="text-sm truncate">{s.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Difficulty (AI mode only) */}
          {(
            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">Difficulty</p>
              <div className="flex gap-2">
                {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-medium border capitalize transition-colors",
                      difficulty === d
                        ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                        : "bg-white/3 border-white/8 text-gray-400 hover:text-gray-200 hover:border-white/15"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Question count */}
          <div>
            <p className="text-sm font-medium text-gray-300 mb-3">Number of Questions</p>
            <div className="flex gap-2">
              {([10, 25, 50] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setQCount(n)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors",
                    qCount === n
                      ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                      : "bg-white/3 border-white/8 text-gray-400 hover:text-gray-200 hover:border-white/15"
                  )}
                >
                  {n}{n > 20 ? "*" : ""}
                </button>
              ))}
            </div>
            {qCount > 20 && (
              <p className="text-xs text-gray-600 mt-1.5">* AI mode is capped at 20 questions</p>
            )}
          </div>

          {/* Timed toggle */}
          <div>
            <p className="text-sm font-medium text-gray-300 mb-3">Mode</p>
            <div className="flex gap-2">
              {[{ label: "Timed", value: true }, { label: "Untimed", value: false }].map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => setTimed(value)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors",
                    timed === value
                      ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                      : "bg-white/3 border-white/8 text-gray-400 hover:text-gray-200 hover:border-white/15"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Time limit */}
          {timed && (
            <div>
              <p className="text-sm font-medium text-gray-300 mb-3">Time Limit</p>
              <div className="flex gap-2">
                {[30, 60, 90].map((m) => (
                  <button
                    key={m}
                    onClick={() => setTimeMins(m)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors",
                      timeMins === m
                        ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                        : "bg-white/3 border-white/8 text-gray-400 hover:text-gray-200 hover:border-white/15"
                    )}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-4 text-sm text-gray-400 space-y-1.5">
            <p><Sparkles size={12} className="inline mr-1.5 text-violet-400" />
              <span className="text-gray-300 font-medium">{Math.min(qCount, 20)} questions</span> generated by AI from "{selectedSubject?.title ?? "..."}"
            </p>
            <p>🎯 Difficulty: <span className="text-gray-300 capitalize">{difficulty}</span></p>
            <p>⏱ {timed ? `${timeMins}-minute time limit` : "No time limit — focus on understanding"}</p>
            <p>🎯 Passing score: <span className="text-gray-300">70% or above</span></p>
          </div>

          {/* Error */}
          {aiError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{aiError}</p>
          )}

          {/* Start */}
          <button
            onClick={startAIExam}
            disabled={generating || !selectedSubject || subjects.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 transition-colors"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> Generating questions...</>
            ) : (
              <><Play size={16} /> Start New Exam</>
            )}
          </button>

          {/* Retake previously generated exam — works offline */}
          {savedExam && savedExam.length > 0 && !generating && (
            <button
              onClick={() => launchExam(savedExam)}
              className="w-full flex items-center justify-center gap-2 border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 text-gray-300 hover:text-violet-300 text-sm font-medium rounded-xl py-3 transition-all"
            >
              <RotateCcw size={14} /> Retake last exam ({savedExam.length} questions · works offline)
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (phase === "results") {
    return (
      <div className="p-4 sm:p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Exam Results</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review your performance</p>
        </div>

        <div className={cn(
          "rounded-2xl border p-6 mb-4 flex items-center gap-6",
          passed ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
        )}>
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="22" fill="none" stroke="#1f1f1f" strokeWidth="5" />
              <circle
                cx="28" cy="28" r="22" fill="none"
                stroke={passed ? "#10b981" : "#ef4444"} strokeWidth="5"
                strokeDasharray={`${(accuracy / 100) * 2 * Math.PI * 22} ${2 * Math.PI * 22}`}
                strokeLinecap="round" className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{accuracy}%</span>
            </div>
          </div>
          <div>
            <div className={cn(
              "inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-2",
              passed ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            )}>
              {passed ? <><CheckCircle size={11} /> PASSED</> : <><XCircle size={11} /> FAILED</>}
            </div>
            <p className="text-2xl font-bold text-white">{score} / {total} correct</p>
            <p className="text-sm text-gray-400 mt-1">
              {passed ? "You met the 70% passing threshold." : "Aim for 70% or above to pass. Keep studying!"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Correct",   value: score,         color: "text-emerald-400" },
            { label: "Incorrect", value: total - score, color: "text-red-400"     },
            { label: "Flagged",   value: flagged.size,  color: "text-amber-400"   },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl bg-[#141414] border border-white/8 p-4 text-center">
              <p className={cn("text-2xl font-bold", color)}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-[#141414] border border-white/8 p-5 mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Domain Breakdown</p>
          <div className="space-y-3">
            {domains.map(({ topic, correct: c, total: t, pct }) => (
              <div key={topic}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-gray-300">{topic}</span>
                  <span className="text-xs text-gray-400">
                    {c}/{t} · <span className={pct >= 70 ? "text-emerald-400" : "text-red-400"}>{pct}%</span>
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", pct >= 70 ? "bg-emerald-500" : "bg-red-500")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#141414] border border-white/8 overflow-hidden mb-4">
          <button
            onClick={() => setShowReview((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-300 hover:bg-white/3 transition-colors"
          >
            <span className="flex items-center gap-2"><BookOpen size={15} /> Review All Questions</span>
            <ChevronRight size={14} className={cn("transition-transform", showReview && "rotate-90")} />
          </button>

          {showReview && (
            <div className="divide-y divide-white/5 border-t border-white/8">
              {questions.map((q, i) => {
                const userAns  = answers[i];
                const isCorrect = userAns === q.correct;
                const skipped  = userAns === undefined;
                return (
                  <div key={q.id} className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold",
                        skipped   ? "bg-gray-500/20 text-gray-400" :
                        isCorrect ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                      )}>
                        {skipped ? "—" : isCorrect ? "✓" : "✗"}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-200 mb-2">Q{i + 1}. {q.question}</p>
                        <div className="space-y-1 mb-3">
                          {q.options.map((opt, j) => (
                            <div key={j} className={cn(
                              "text-xs px-3 py-1.5 rounded-lg",
                              j === q.correct                    ? "bg-emerald-500/10 text-emerald-400" :
                              j === userAns && !isCorrect        ? "bg-red-500/10 text-red-400"         :
                              "text-gray-500"
                            )}>
                              {String.fromCharCode(65 + j)}. {opt}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500 bg-white/3 rounded-lg px-3 py-2">{q.explanation}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setPhase("setup")}
            className="flex-1 border border-white/10 hover:border-white/20 hover:bg-white/5 text-gray-300 rounded-xl py-3 text-sm font-medium transition-all"
          >
            New Exam
          </button>
          <button
            onClick={() => launchExam(questions)}
            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
          >
            Retake Same Exam
          </button>
        </div>
      </div>
    );
  }

  // ── Exam ───────────────────────────────────────────────────────────────────
  const q = questions[current];
  const isFlagged = flagged.has(current);

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-[#0a0a0a]">

      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/8 bg-[#0d0d0d] shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setPhase("setup"); }}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-gray-300 hidden sm:inline">
            {selectedSubject ? selectedSubject.title : "Exam"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {timed && (
            <span className={cn(
              "flex items-center gap-1 text-sm font-mono font-bold",
              timeLeft < 120 ? "text-red-400" : timeLeft < 300 ? "text-amber-400" : "text-gray-300"
            )}>
              <Timer size={13} /> {fmt(timeLeft)}
            </span>
          )}
          <span className="text-xs text-gray-500">{Object.keys(answers).length}/{total}</span>
          <button
            onClick={submitExam}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>

      {/* Mobile question grid strip */}
      <div className="lg:hidden shrink-0 px-4 py-2.5 border-b border-white/8 bg-[#0d0d0d]">
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "w-7 h-7 shrink-0 rounded-lg text-xs font-bold transition-all",
                i === current
                  ? "bg-violet-600 text-white"
                  : flagged.has(i)
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : answers[i] !== undefined
                  ? "bg-violet-500/20 text-violet-300"
                  : "bg-white/5 text-gray-500"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className="flex gap-3 mt-1.5 text-[10px] text-gray-600">
          {[
            { bg: "bg-violet-600", label: "Current" },
            { bg: "bg-violet-500/20", label: "Answered" },
            { bg: "bg-amber-500/20", label: "Flagged" },
            { bg: "bg-white/5", label: "Unanswered" },
          ].map(({ bg, label }) => (
            <span key={label} className="flex items-center gap-1">
              <span className={cn("w-2.5 h-2.5 rounded-sm shrink-0", bg)} /> {label}
            </span>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-2xl mx-auto space-y-4">

            <div className="flex items-center justify-between">
              <span className="text-xs bg-violet-500/10 text-violet-400 px-2.5 py-1 rounded-full font-medium">
                {q.topic}
              </span>
              <span className="text-xs text-gray-500">Question {current + 1} of {total}</span>
            </div>

            <div className="rounded-2xl bg-[#141414] border border-white/8 p-4 sm:p-5">
              <p className="text-sm sm:text-base text-gray-100 leading-relaxed">{q.question}</p>
            </div>

            <div className="space-y-2.5">
              {q.options.map((opt, j) => {
                const selected = answers[current] === j;
                return (
                  <button
                    key={j}
                    onClick={() => setAnswers((prev) => ({ ...prev, [current]: j }))}
                    className={cn(
                      "w-full text-left rounded-xl border p-3 sm:p-4 text-sm transition-all flex items-start gap-3",
                      selected
                        ? "bg-violet-600/15 border-violet-500/40 text-violet-200"
                        : "bg-[#141414] border-white/8 text-gray-300 hover:border-white/15 hover:bg-white/[0.03]"
                    )}
                  >
                    <span className={cn(
                      "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5",
                      selected ? "bg-violet-600 text-white" : "bg-white/8 text-gray-400"
                    )}>
                      {String.fromCharCode(65 + j)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1 pb-4">
              <button
                onClick={toggleFlag}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-colors",
                  isFlagged
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "border-white/8 text-gray-500 hover:text-gray-300 hover:border-white/15"
                )}
              >
                <Flag size={12} /> {isFlagged ? "Unflag" : "Flag"}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrent((c) => Math.max(0, c - 1))}
                  disabled={current === 0}
                  className="flex items-center gap-1 text-xs font-medium px-3.5 py-2 rounded-lg border border-white/8 text-gray-400 hover:text-gray-200 hover:border-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <button
                  onClick={() => current === total - 1 ? submitExam() : setCurrent((c) => c + 1)}
                  className="flex items-center gap-1 text-xs font-semibold px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                >
                  {current === total - 1 ? "Finish" : "Next"} <ChevronRight size={13} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:flex flex-col w-52 shrink-0 border-l border-white/8 bg-[#0d0d0d] p-4 overflow-y-auto">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Questions</p>
          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {questions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "aspect-square w-full rounded-lg text-xs font-medium transition-all",
                  i === current
                    ? "bg-violet-600 text-white ring-2 ring-violet-500/50"
                    : flagged.has(i)
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : answers[i] !== undefined
                    ? "bg-violet-500/20 text-violet-300"
                    : "bg-white/5 text-gray-500 hover:bg-white/10"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="space-y-1.5 text-xs text-gray-500">
            {[
              { bg: "bg-violet-600", label: "Current" },
              { bg: "bg-violet-500/20 border border-violet-500/30", label: "Answered" },
              { bg: "bg-amber-500/20 border border-amber-500/30", label: "Flagged" },
              { bg: "bg-white/5", label: "Unanswered" },
            ].map(({ bg, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded", bg)} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
