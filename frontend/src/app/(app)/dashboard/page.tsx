"use client";
import { useEffect, useState } from "react";
import { Bell, Search, Flame, BookOpen, Target, Zap } from "lucide-react";
import { ExamReadinessCard } from "@/components/dashboard/ExamReadinessCard";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { WeaknessHeatmap } from "@/components/dashboard/WeaknessHeatmap";
import { ForgettingForecast } from "@/components/dashboard/ForgettingForecast";
import { ScheduledActions } from "@/components/dashboard/ScheduledActions";
import { TopAssetsCard } from "@/components/dashboard/TopAssetsCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { api, DashboardData, Subject } from "@/lib/api";

const MOCK_DASHBOARD: DashboardData = {
  stats: {
    exam_readiness: 72,
    study_streak: 14,
    mastery_percentage: 61,
    daily_review_queue: 23,
    cards_due_today: 23,
    last_session_accuracy: 0.84,
    plan: "free",
  },
  topic_scores: [
    { topic: "Risk Management", score: 88, status: "strong" },
    { topic: "Stakeholder Engagement", score: 55, status: "moderate" },
    { topic: "Agile Frameworks", score: 71, status: "moderate" },
    { topic: "Cost Control", score: 32, status: "weak" },
    { topic: "Procurement", score: 18, status: "weak" },
    { topic: "Quality Management", score: 90, status: "strong" },
  ],
  forgetting_forecasts: [
    { concept: "Monte Carlo Analysis", subject: "Risk Management", hours_until_forgotten: 8, urgency: "critical" },
    { concept: "Stakeholder Register", subject: "Stakeholder Engagement", hours_until_forgotten: 24, urgency: "high" },
    { concept: "Earned Value Management", subject: "Cost Control", hours_until_forgotten: 48, urgency: "medium" },
  ],
  performance_trend: [
    { date: "Mon", score: 58 },
    { date: "Tue", score: 63 },
    { date: "Wed", score: 60 },
    { date: "Thu", score: 71 },
    { date: "Fri", score: 68 },
    { date: "Sat", score: 79 },
    { date: "Sun", score: 84 },
  ],
};

const MOCK_SUBJECTS: Subject[] = [
  { id: 1, title: "Risk Management", description: null, mastery_score: 0.88 },
  { id: 2, title: "Stakeholder Engagement", description: null, mastery_score: 0.55 },
  { id: 3, title: "Agile Frameworks", description: null, mastery_score: 0.71 },
  { id: 4, title: "Cost Control", description: null, mastery_score: 0.32 },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(MOCK_DASHBOARD);
  const [subjects, setSubjects] = useState<Subject[]>(MOCK_SUBJECTS);

  useEffect(() => {
    api.dashboard.get().then(setData).catch(() => {});
    api.subjects.list().then(setSubjects).catch(() => {});
  }, []);

  const { stats, topic_scores, forgetting_forecasts, performance_trend } = data;

  return (
    <div className="p-6 space-y-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Executive Overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search concepts..."
              className="bg-[#141414] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50 w-52"
            />
          </div>
          <button className="relative w-9 h-9 rounded-xl bg-[#141414] border border-white/8 flex items-center justify-center hover:bg-white/5 transition-colors">
            <Bell size={15} className="text-gray-400" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-500" />
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-white/8">
        {["Overview", "Reports", "History", "Activity"].map((t) => (
          <button
            key={t}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              t === "Overview"
                ? "text-white border-violet-500"
                : "text-gray-500 border-transparent hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Study Streak" value={`${stats.study_streak}d`} sub="Keep it up!" icon={Flame} color="amber" trend={12} />
        <StatCard label="Cards Due" value={stats.cards_due_today} sub="Review queue" icon={Zap} color="violet" />
        <StatCard label="Last Session" value={stats.last_session_accuracy ? `${Math.round(stats.last_session_accuracy * 100)}%` : "—"} sub="Accuracy" icon={Target} color="emerald" trend={5} />
        <StatCard label="Subjects" value={subjects.length} sub="Active courses" icon={BookOpen} color="blue" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="xl:col-span-2 space-y-4">
          <PerformanceChart data={performance_trend} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WeaknessHeatmap topics={topic_scores as any} />
            <div className="space-y-4">
              <ScheduledActions />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <ExamReadinessCard
            score={stats.exam_readiness}
            streak={stats.study_streak}
            masteryPct={stats.mastery_percentage}
          />
          <ForgettingForecast forecasts={forgetting_forecasts as any} queueCount={stats.daily_review_queue} />
          <TopAssetsCard subjects={subjects} />
        </div>
      </div>
    </div>
  );
}
