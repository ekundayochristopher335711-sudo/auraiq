"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Timer, Flag, ChevronLeft, ChevronRight, Play, CheckCircle, XCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "setup" | "exam" | "results";

interface Question {
  id: number;
  topic: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

// ── Mock question bank ─────────────────────────────────────────────────────────
const MOCK_QUESTIONS: Question[] = [
  {
    id: 1, topic: "Risk Management",
    question: "A project manager identifies a new risk late in the project with high probability and significant schedule impact. What is the FIRST action to take?",
    options: [
      "Escalate immediately to the project sponsor",
      "Document the risk in the risk register and perform analysis",
      "Implement a workaround to address the risk",
      "Request a schedule change through the change control process",
    ],
    correct: 1,
    explanation: "When a new risk is identified, always document it in the risk register first and analyze its probability and impact. Only after analysis can an appropriate response strategy be chosen.",
  },
  {
    id: 2, topic: "Cost Control",
    question: "A project has an EV of $80,000, AC of $95,000, and PV of $85,000. What is the Cost Performance Index (CPI)?",
    options: ["0.84", "0.94", "1.06", "1.19"],
    correct: 0,
    explanation: "CPI = EV ÷ AC = $80,000 ÷ $95,000 ≈ 0.84. A CPI below 1.0 means the project is over budget — only $0.84 of planned value is delivered per $1 spent.",
  },
  {
    id: 3, topic: "Stakeholder Engagement",
    question: "A key stakeholder is consistently disengaged from project meetings and has not reviewed deliverables. What is the BEST approach?",
    options: [
      "Document the issue and continue without their input",
      "Escalate to the project sponsor for intervention",
      "Identify their concerns and adapt the engagement strategy",
      "Remove them from the communication plan",
    ],
    correct: 2,
    explanation: "The best approach is to understand the root cause of disengagement and adapt the engagement strategy accordingly. Stakeholder engagement is proactive and should be tailored to individual needs.",
  },
  {
    id: 4, topic: "Agile Frameworks",
    question: "During a Sprint Review, the product owner rejects a completed user story for an unstated business requirement. What should the Scrum Master do?",
    options: [
      "Add the new requirement to the current sprint",
      "Facilitate discussion on the definition of done and clarify acceptance criteria",
      "Document the issue and escalate to senior management",
      "Re-plan the entire sprint to include the new requirement",
    ],
    correct: 1,
    explanation: "The Scrum Master should facilitate a retrospective-style discussion to improve the acceptance criteria process. The story returns to the backlog with clearer criteria for the next sprint.",
  },
  {
    id: 5, topic: "Quality Management",
    question: "A project manager wants to identify the root cause of recurring defects accounting for 80% of quality issues. Which tool is MOST appropriate?",
    options: [
      "Control chart",
      "Pareto diagram",
      "Scatter diagram",
      "Fishbone (Ishikawa) diagram",
    ],
    correct: 3,
    explanation: "The Fishbone (Ishikawa) diagram is designed to identify root causes by exploring causal categories. The Pareto diagram identifies most frequent defects but not their root causes.",
  },
  {
    id: 6, topic: "Risk Management",
    question: "What is the primary purpose of Monte Carlo simulation in project risk management?",
    options: [
      "To rank risks by probability and impact",
      "To model the probability distribution of project outcomes",
      "To calculate the expected monetary value of risk events",
      "To create risk response strategies for identified threats",
    ],
    correct: 1,
    explanation: "Monte Carlo simulation runs thousands of iterations using probability distributions to produce a distribution of overall project outcomes — quantifying the range of possible completion dates or costs.",
  },
  {
    id: 7, topic: "Stakeholder Engagement",
    question: "Which factor should be considered FIRST when developing the communications management plan?",
    options: [
      "The preferred communication technology available",
      "The stakeholders' communication requirements and preferences",
      "The project schedule and milestone dates",
      "The organizational communication policies",
    ],
    correct: 1,
    explanation: "Communications planning starts with understanding stakeholder requirements — what they need, when, and in what format. Technology and policies are secondary to meeting stakeholder needs.",
  },
  {
    id: 8, topic: "Agile Frameworks",
    question: "What is the primary benefit of WIP (work-in-progress) limits in a Kanban board?",
    options: [
      "They ensure all team members have equal workloads",
      "They prevent bottlenecks and improve flow by limiting concurrent work",
      "They define the maximum number of items in the backlog",
      "They set the team velocity for sprint planning",
    ],
    correct: 1,
    explanation: "WIP limits prevent work from accumulating at bottlenecks, forcing the team to complete existing work before starting new tasks. This improves flow efficiency and exposes process constraints.",
  },
  {
    id: 9, topic: "Cost Control",
    question: "A project completes with AC of $1.2M against a BAC of $1.0M and final EV of $1.0M. What is the Variance at Completion (VAC)?",
    options: ["-$200,000", "$200,000", "$0", "-$100,000"],
    correct: 0,
    explanation: "VAC = BAC − EAC. Since the project is complete, EAC = AC = $1.2M, so VAC = $1.0M − $1.2M = −$200,000. Negative VAC means the project finished $200,000 over budget.",
  },
  {
    id: 10, topic: "Quality Management",
    question: "A completed deliverable does not meet acceptance criteria and the project is on a tight schedule. What is the BEST course of action?",
    options: [
      "Deliver it and document the defect for the next phase",
      "Seek a formal change request to lower the acceptance criteria",
      "Rework the deliverable to meet acceptance criteria before delivering",
      "Negotiate with the customer to accept it as-is",
    ],
    correct: 2,
    explanation: "Quality cannot be compromised — if a deliverable doesn't meet acceptance criteria, it must be reworked. Schedule pressure is never justification for delivering non-conforming work.",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ExamSimPage() {
  const [phase, setPhase]       = useState<Phase>("setup");
  const [qCount, setQCount]     = useState<10 | 25 | 50>(10);
  const [timed, setTimed]       = useState(true);
  const [timeMins, setTimeMins] = useState(30);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers]   = useState<Record<number, number>>({});
  const [flagged, setFlagged]   = useState<Set<number>>(new Set());
  const [current, setCurrent]   = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start/stop countdown
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

  // Auto-submit when time runs out
  useEffect(() => {
    if (phase === "exam" && timed && timeLeft === 0 && questions.length > 0) {
      setPhase("results");
    }
  }, [timeLeft, phase, timed, questions.length]);

  useEffect(() => {
    api.subjects.list()
      .then((list) => setSubjects(list.map((subject) => subject.title)))
      .catch(() => setSubjects([]))
      .finally(() => setLoadingSubjects(false));
  }, []);

  const startExam = () => {
    const qs = MOCK_QUESTIONS.slice(0, Math.min(qCount, MOCK_QUESTIONS.length));
    setQuestions(qs);
    setAnswers({});
    setFlagged(new Set());
    setCurrent(0);
    setTimeLeft(timeMins * 60);
    setShowReview(false);
    setPhase("exam");
  };

  const submitExam = () => {
    if (timerRef.current) clearInterval(timerRef.current);
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
    if (!loadingSubjects && subjects.length === 0) {
      return (
        <div className="p-6 max-w-2xl">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">Exam Simulator</h1>
            <p className="text-sm text-gray-500 mt-0.5">Practice under real exam conditions</p>
          </div>
          <div className="rounded-2xl bg-[#141414] border border-white/8 p-8 text-center">
            <p className="text-lg font-semibold text-white mb-3">Add your first subject</p>
            <p className="text-sm text-gray-400 mb-6">
              Create a subject and upload study material to unlock personalized exam practice.
            </p>
            <Link href="/subjects" className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl px-5 py-3 transition-colors">
              <BookOpen size={16} /> Create a subject
            </Link>
          </div>
        </div>
      );
    }

    const available = Math.min(qCount, MOCK_QUESTIONS.length);
    return (
      <div className="p-6 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Exam Simulator</h1>
          <p className="text-sm text-gray-500 mt-0.5">Practice under real exam conditions</p>
        </div>

        <div className="rounded-2xl bg-[#141414] border border-white/8 p-6 space-y-6">
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
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-300 mb-3">Mode</p>
            <div className="flex gap-2">
              {[
                { label: "Timed",     value: true },
                { label: "Untimed",   value: false },
              ].map(({ label, value }) => (
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

          <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-4 text-sm text-gray-400 space-y-1.5">
            <p>📋 <span className="text-gray-300 font-medium">{available} questions</span> from the PMP question bank</p>
            <p>⏱ {timed ? `${timeMins}-minute time limit` : "No time limit — focus on understanding"}</p>
            <p>🎯 Passing score: <span className="text-gray-300">70% or above</span></p>
          </div>

          <button
            onClick={startExam}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            <Play size={16} /> Start Exam
          </button>
        </div>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (phase === "results") {
    return (
      <div className="p-6 max-w-3xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Exam Results</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review your performance</p>
        </div>

        {/* Score banner */}
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

        {/* Stats */}
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

        {/* Domain breakdown */}
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

        {/* Question review accordion */}
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

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setPhase("setup")}
            className="flex-1 border border-white/10 hover:border-white/20 hover:bg-white/5 text-gray-300 rounded-xl py-3 text-sm font-medium transition-all"
          >
            New Exam
          </button>
          <button
            onClick={startExam}
            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
          >
            Retake
          </button>
        </div>
      </div>
    );
  }

  // ── Exam ───────────────────────────────────────────────────────────────────
  const q = questions[current];
  const isFlagged = flagged.has(current);

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-[#0d0d0d]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setPhase("setup"); }}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-gray-300">PMP Practice Exam</span>
        </div>
        <div className="flex items-center gap-4">
          {timed && (
            <span className={cn(
              "flex items-center gap-1.5 text-sm font-mono font-bold",
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

      {/* Content */}
      <div className="flex flex-1 gap-0 min-h-0">
        {/* Question panel — full width on mobile, shares space with sidebar on lg+ */}
        <div className="flex-1 min-w-0 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5">
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
                      "w-full text-left rounded-xl border p-3 sm:p-4 text-sm transition-all",
                      selected
                        ? "bg-violet-600/15 border-violet-500/40 text-violet-200"
                        : "bg-[#141414] border-white/8 text-gray-300 hover:border-white/15 hover:bg-white/3"
                    )}
                  >
                    <span className={cn(
                      "inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold mr-3 shrink-0",
                      selected ? "bg-violet-600 text-white" : "bg-white/8 text-gray-400"
                    )}>
                      {String.fromCharCode(65 + j)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Nav controls */}
            <div className="flex items-center justify-between pt-2">
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
                  className="flex items-center gap-1 text-xs font-medium px-3 sm:px-3.5 py-2 rounded-lg border border-white/8 text-gray-400 hover:text-gray-200 hover:border-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <button
                  onClick={() => current === total - 1 ? submitExam() : setCurrent((c) => c + 1)}
                  className="flex items-center gap-1 text-xs font-semibold px-3 sm:px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
                >
                  {current === total - 1 ? "Finish" : "Next"} <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* Mobile question grid — hidden on desktop where sidebar handles this */}
            <div className="lg:hidden border-t border-white/8 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Jump to question</p>
              <div className="grid grid-cols-10 gap-1 mb-3">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={cn(
                      "aspect-square w-full rounded-md text-xs font-medium transition-all",
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
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {[
                  { bg: "bg-violet-600", label: "Current" },
                  { bg: "bg-violet-500/20 border border-violet-500/30", label: "Answered" },
                  { bg: "bg-amber-500/20 border border-amber-500/30", label: "Flagged" },
                  { bg: "bg-white/5", label: "Unanswered" },
                ].map(({ bg, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={cn("w-3 h-3 rounded", bg)} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop question navigator — hidden on mobile */}
        <div className="hidden lg:block w-52 shrink-0 border-l border-white/8 bg-[#0d0d0d] p-4 sticky top-[61px] self-start">
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
              { bg: "bg-violet-600",          label: "Current"    },
              { bg: "bg-violet-500/20 border border-violet-500/30", label: "Answered"   },
              { bg: "bg-amber-500/20 border border-amber-500/30",   label: "Flagged"    },
              { bg: "bg-white/5",             label: "Unanswered" },
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
