"use client";
import { useEffect, useState } from "react";
import { Search, Flame, BookOpen, Target, Zap, Upload, ArrowRight } from "lucide-react";
import Link from "next/link";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ExamReadinessCard } from "@/components/dashboard/ExamReadinessCard";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { WeaknessHeatmap } from "@/components/dashboard/WeaknessHeatmap";
import { ForgettingForecast } from "@/components/dashboard/ForgettingForecast";
import { ScheduledActions } from "@/components/dashboard/ScheduledActions";
import { TopAssetsCard } from "@/components/dashboard/TopAssetsCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { api, DashboardData, Subject } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

type Tab = "Overview" | "Reports" | "History" | "Activity";

export default function DashboardPage() {
  const [data, setData]           = useState<DashboardData | null>(null);
  const [subjects, setSubjects]   = useState<Subject[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [realSubjects, setRealSubjects]     = useState<Subject[] | null>(null);
  const [activeTab, setActiveTab]           = useState<Tab>("Overview");
  const [searchQuery, setSearchQuery]       = useState("");

  useEffect(() => {
    Promise.all([
      api.dashboard.get().then(setData).catch(() => {}),
      api.subjects.list()
        .then((s) => { setSubjects(s); setRealSubjects(s); })
        .catch(() => { setRealSubjects([]); }),
    ]).finally(() => setLoading(false));

    // Refresh dashboard on any flashcard or session change
    const refresh = () => { api.dashboard.get().then(setData).catch(() => {}); };
    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "flashcards" }, refresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "study_sessions" }, refresh)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (realSubjects !== null && realSubjects.length === 0) {
      const seen = localStorage.getItem("auraiq_onboarded");
      if (!seen) setShowOnboarding(true);
    }
  }, [realSubjects]);

  const dismissOnboarding = () => {
    localStorage.setItem("auraiq_onboarded", "1");
    setShowOnboarding(false);
  };

  const { stats, topic_scores, forgetting_forecasts, performance_trend } = data ?? {
    stats: { exam_readiness: 0, study_streak: 0, mastery_percentage: 0, daily_review_queue: 0, cards_due_today: 0, last_session_accuracy: null, plan: "free" },
    topic_scores: [], forgetting_forecasts: [], performance_trend: [],
  };

  const isNewUser = realSubjects !== null && realSubjects.length === 0;
  const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const reviewedToday = performance_trend[performance_trend.length - 1]?.date === todayLabel;
  const filteredSubjects = searchQuery.trim()
    ? subjects.filter((s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : subjects;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-full">
      {showOnboarding && <OnboardingModal onDismiss={dismissOnboarding} />}

      {/* Empty state for new users */}
      {isNewUser && (
        <div className="rounded-2xl bg-[#141414] border border-violet-500/20 p-5 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <Upload size={28} className="text-violet-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Welcome to Recalro!</h2>
          <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6 leading-relaxed">
            Upload your first study document to get started. AI will extract modules, concepts, and flashcards automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/subjects" className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl px-6 py-2.5 transition-colors">
              <BookOpen size={15} /> Create your first subject <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 text-left">
            {[
              { n: "1", title: "Create a subject", desc: "Name your study topic or exam" },
              { n: "2", title: "Upload a document", desc: "PDF, DOCX, or TXT — up to 30MB" },
              { n: "3", title: "Start reviewing",   desc: "AI flashcards generated instantly" },
            ].map(({ n, title, desc }) => (
              <div key={n} className="bg-white/3 rounded-xl p-4 flex sm:block items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-violet-500/20 text-violet-400 text-xs font-bold flex items-center justify-center shrink-0 sm:mb-2">{n}</div>
                <div>
                  <p className="text-sm font-medium text-white sm:mb-1">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Executive Overview</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Search — filters subjects across all tabs */}
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subjects..."
              className="bg-[#141414] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50 w-44"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors text-xs"
              >✕</button>
            )}
          </div>

          {/* Bell — notification center */}
          <NotificationBell
            cardsDue={stats.cards_due_today}
            streak={stats.study_streak}
            reviewedToday={reviewedToday}
            weakSubjects={subjects.filter((s) => s.mastery_score < 0.4).map((s) => ({ id: s.id, title: s.title }))}
            isNewUser={isNewUser}
            lastAccuracy={stats.last_session_accuracy}
          />
        </div>
      </div>

      {/* Mobile search */}
      <div className="sm:hidden relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search subjects..."
          className="w-full bg-[#141414] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs">✕</button>
        )}
      </div>

      {/* Search results banner */}
      {searchQuery.trim() && (
        <div className="rounded-xl bg-violet-500/10 border border-violet-500/20 px-4 py-2.5 flex items-center justify-between">
          <p className="text-sm text-violet-300">
            {filteredSubjects.length > 0
              ? `${filteredSubjects.length} subject${filteredSubjects.length !== 1 ? "s" : ""} matching "${searchQuery}"`
              : `No subjects match "${searchQuery}"`}
          </p>
          <Link href="/subjects" className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2">
            View all subjects
          </Link>
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-white/8 overflow-x-auto scrollbar-hide">
        {(["Overview", "Reports", "History", "Activity"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              t === activeTab
                ? "text-white border-violet-500"
                : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Quick stats row — always visible */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Study Streak" value={`${stats.study_streak}d`} sub="Keep it up!" icon={Flame} color="amber" />
        <StatCard label="Cards Due" value={stats.cards_due_today} sub="Review queue" icon={Zap} color="violet" />
        <StatCard label="Last Session" value={stats.last_session_accuracy ? `${Math.round(stats.last_session_accuracy * 100)}%` : "—"} sub="Accuracy" icon={Target} color="emerald" />
        <StatCard label="Subjects" value={subjects.length} sub="Active courses" icon={BookOpen} color="blue" />
      </div>

      {/* ── Overview ─────────────────────────────────────────────────────────── */}
      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <PerformanceChart data={performance_trend} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <WeaknessHeatmap topics={topic_scores as any} />
              <div className="space-y-4">
                <ScheduledActions
                  cardsDue={stats.cards_due_today}
                  streak={stats.study_streak}
                  subjects={subjects}
                  lastSessionDate={performance_trend[performance_trend.length - 1]?.date ?? null}
                />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <ExamReadinessCard
              score={stats.exam_readiness}
              streak={stats.study_streak}
              masteryPct={stats.mastery_percentage}
            />
            <ForgettingForecast forecasts={forgetting_forecasts as any} queueCount={stats.daily_review_queue} />
            <TopAssetsCard subjects={filteredSubjects} />
          </div>
        </div>
      )}

      {/* ── Reports ──────────────────────────────────────────────────────────── */}
      {activeTab === "Reports" && (
        <div className="space-y-4">
          <ExamReadinessCard
            score={stats.exam_readiness}
            streak={stats.study_streak}
            masteryPct={stats.mastery_percentage}
          />
          <PerformanceChart data={performance_trend} />
          <WeaknessHeatmap topics={topic_scores as any} />
          {filteredSubjects.length > 0 && (
            <div className="rounded-2xl bg-[#141414] border border-white/8 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Subject Breakdown</p>
              <div className="space-y-3">
                {filteredSubjects.map((s) => {
                  const pct = Math.round(s.mastery_score * 100);
                  return (
                    <div key={s.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-gray-300">{s.title}</span>
                        <span className={`text-xs font-semibold ${pct >= 75 ? "text-emerald-400" : pct >= 45 ? "text-amber-400" : "text-red-400"}`}>{pct}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${pct >= 75 ? "bg-emerald-500" : pct >= 45 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── History ──────────────────────────────────────────────────────────── */}
      {activeTab === "History" && (
        <div className="rounded-2xl bg-[#141414] border border-white/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/6">
            <p className="text-sm font-semibold text-white">Study Session History</p>
            <p className="text-xs text-gray-500 mt-0.5">Your last {performance_trend.length} sessions</p>
          </div>
          {performance_trend.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                <Target size={20} className="text-gray-500" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">No sessions yet</p>
              <p className="text-xs text-gray-500">Complete a flashcard review to see your history here.</p>
              <Link href="/flashcards" className="mt-4 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl px-4 py-2 transition-colors">
                <Zap size={12} /> Start reviewing
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {performance_trend.slice().reverse().map((session, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${session.score >= 70 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                      {session.score}%
                    </div>
                    <div>
                      <p className="text-sm text-gray-200 font-medium">{session.date}</p>
                      <p className="text-xs text-gray-500">{session.score >= 70 ? "Good session" : "Needs work"}</p>
                    </div>
                  </div>
                  <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${session.score >= 70 ? "bg-emerald-500" : "bg-red-500"}`}
                      style={{ width: `${session.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Activity ─────────────────────────────────────────────────────────── */}
      {activeTab === "Activity" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Current Streak", value: `${stats.study_streak} days`, icon: Flame, color: "text-amber-400", bg: "bg-amber-500/10" },
              { label: "Cards Due Today", value: stats.cards_due_today, icon: Zap, color: "text-violet-400", bg: "bg-violet-500/10" },
              { label: "Subjects Active", value: subjects.length, icon: BookOpen, color: "text-blue-400", bg: "bg-blue-500/10" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-2xl bg-[#141414] border border-white/8 p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-[#141414] border border-white/8 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-4">Recent Performance</p>
            {performance_trend.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <p className="text-sm text-gray-500 mb-3">No activity recorded yet.</p>
                <Link href="/flashcards" className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl px-4 py-2 transition-colors">
                  <Zap size={12} /> Start a session
                </Link>
              </div>
            ) : (
              <div className="flex items-end gap-1 h-24">
                {performance_trend.map((s, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div
                      className={`w-full rounded-t-sm transition-all ${s.score >= 70 ? "bg-emerald-500/60" : "bg-red-500/40"}`}
                      style={{ height: `${Math.max(8, s.score)}%` }}
                    />
                    <span className="text-[9px] text-gray-600 hidden sm:block">{s.date.split(" ")[1]}</span>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-white/10 text-xs text-gray-300 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-10">
                      {s.score}% · {s.date}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <ForgettingForecast forecasts={forgetting_forecasts as any} queueCount={stats.daily_review_queue} />
        </div>
      )}
    </div>
  );
}
