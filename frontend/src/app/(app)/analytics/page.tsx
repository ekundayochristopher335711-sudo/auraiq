"use client";
import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Clock, Target, Flame, Minus, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, DashboardData } from "@/lib/api";
import Link from "next/link";

type Period = "7D" | "30D" | "All";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-bold text-violet-400">{payload[0].value}%</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod]   = useState<Period>("30D");
  const [mounted, setMounted] = useState(false);
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    api.dashboard.get()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const hasData = data && (
    (data.performance_trend?.length > 0) ||
    (data.topic_scores?.length > 0) ||
    (data.stats?.study_streak > 0) ||
    (data.stats?.mastery_percentage > 0)
  );

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
          <BarChart3 size={28} className="text-violet-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">No data yet</h2>
        <p className="text-sm text-gray-500 max-w-xs mb-6">
          Complete your first flashcard session to start seeing analytics and performance trends.
        </p>
        <Link href="/flashcards"
          className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl px-6 py-2.5 transition-colors">
          Start a session
        </Link>
      </div>
    );
  }

  const trend  = data.performance_trend ?? [];
  const topics = data.topic_scores ?? [];
  const stats  = data.stats;
  const trendData = period === "7D" ? trend.slice(-7) : trend;

  const totalHours = stats.study_streak > 0 ? `${stats.study_streak * 25}m` : "0m";

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Deep-dive into your learning performance</p>
        </div>
        <div className="flex gap-1 bg-[#141414] border border-white/8 rounded-xl p-1">
          {(["7D", "30D", "All"] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                period === p ? "bg-violet-600 text-white" : "text-gray-500 hover:text-gray-300")}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Study Streak",    value: `${stats.study_streak}d`,              Icon: Flame,      color: "amber"  },
          { label: "Mastery",         value: `${stats.mastery_percentage}%`,         Icon: Target,     color: "emerald" },
          { label: "Cards Due Today", value: stats.cards_due_today,                  Icon: Clock,      color: "violet"  },
          { label: "Last Accuracy",   value: stats.last_session_accuracy ? `${Math.round(stats.last_session_accuracy * 100)}%` : "—", Icon: TrendingUp, color: "blue" },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-2xl bg-[#141414] border border-white/8 p-4">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-3",
              color === "violet" ? "bg-violet-500/10" : color === "emerald" ? "bg-emerald-500/10" :
              color === "blue"   ? "bg-blue-500/10"   : "bg-amber-500/10")}>
              <Icon size={15} className={cn(
                color === "violet" ? "text-violet-400" : color === "emerald" ? "text-emerald-400" :
                color === "blue"   ? "text-blue-400"   : "text-amber-400")} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 space-y-4">
          <div className="rounded-2xl bg-[#141414] border border-white/8 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Performance Trend</p>
            <p className="text-sm text-gray-300 mb-5">Accuracy over time</p>
            {!mounted || trendData.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-sm text-gray-600">
                No trend data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={trendData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="anaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2}
                    fill="url(#anaGrad)" dot={false} activeDot={{ r: 4, fill: "#7c3aed", strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-2xl bg-[#141414] border border-white/8 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Domain Mastery</p>
            <p className="text-sm text-gray-300 mb-4">Sorted by strength</p>
            {topics.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-4">No topics yet</p>
            ) : (
              <div className="space-y-4">
                {topics.map(({ topic, score }) => {
                  const barColor  = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
                  const textColor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
                  return (
                    <div key={topic}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-gray-300 truncate max-w-[70%]">{topic}</span>
                        <span className={cn("text-xs font-semibold", textColor)}>{score}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
