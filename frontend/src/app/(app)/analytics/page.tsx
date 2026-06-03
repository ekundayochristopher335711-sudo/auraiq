"use client";
import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Clock, Target, Flame, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Period = "7D" | "30D" | "All";

// ── Mock data ──────────────────────────────────────────────────────────────────
const ALL_TREND = [
  { date: "May 3",  score: 52 }, { date: "May 5",  score: 55 },
  { date: "May 7",  score: 53 }, { date: "May 10", score: 60 },
  { date: "May 12", score: 58 }, { date: "May 14", score: 62 },
  { date: "May 16", score: 65 }, { date: "May 18", score: 63 },
  { date: "May 20", score: 68 }, { date: "May 22", score: 70 },
  { date: "May 24", score: 67 }, { date: "May 26", score: 74 },
  { date: "May 27", score: 72 }, { date: "May 28", score: 76 },
  { date: "May 29", score: 75 }, { date: "May 30", score: 79 },
  { date: "May 31", score: 81 }, { date: "Jun 1",  score: 84 },
];

const DOMAINS = [
  { topic: "Quality Management",     score: 90, change:  8 },
  { topic: "Risk Management",        score: 88, change:  5 },
  { topic: "Agile Frameworks",       score: 71, change: -3 },
  { topic: "Stakeholder Engagement", score: 55, change:  2 },
  { topic: "Cost Control",           score: 32, change: -5 },
  { topic: "Procurement",            score: 18, change:  0 },
];

const SESSIONS = [
  { date: "Jun 1, 2026",  duration: 28, cards: 24, accuracy: 87 },
  { date: "May 31, 2026", duration: 45, cards: 38, accuracy: 92 },
  { date: "May 29, 2026", duration: 32, cards: 26, accuracy: 73 },
  { date: "May 28, 2026", duration: 55, cards: 48, accuracy: 84 },
  { date: "May 27, 2026", duration: 20, cards: 15, accuracy: 60 },
  { date: "May 26, 2026", duration: 38, cards: 32, accuracy: 79 },
  { date: "May 25, 2026", duration: 50, cards: 42, accuracy: 88 },
  { date: "May 24, 2026", duration: 25, cards: 20, accuracy: 70 },
  { date: "May 23, 2026", duration: 60, cards: 55, accuracy: 91 },
  { date: "May 22, 2026", duration: 35, cards: 28, accuracy: 65 },
];

const WEEKLY_PATTERN = [
  { day: "Mon", mins: 32 }, { day: "Tue", mins: 45 },
  { day: "Wed", mins: 28 }, { day: "Thu", mins: 55 },
  { day: "Fri", mins: 20 }, { day: "Sat", mins: 60 },
  { day: "Sun", mins: 38 },
];

const SUMMARY = { total_hours: "24h 35m", sessions: 38, avg_accuracy: 76, best_streak: 14 };

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-bold text-violet-400">{payload[0].value}%</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30D");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const trendData = period === "7D" ? ALL_TREND.slice(-7) : ALL_TREND;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Deep-dive into your learning performance</p>
        </div>
        <div className="flex gap-1 bg-[#141414] border border-white/8 rounded-xl p-1">
          {(["7D", "30D", "All"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors",
                period === p ? "bg-violet-600 text-white" : "text-gray-500 hover:text-gray-300"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Study Time", value: SUMMARY.total_hours, Icon: Clock,       color: "violet"  },
          { label: "Sessions",         value: SUMMARY.sessions,    Icon: Target,      color: "emerald" },
          { label: "Avg Accuracy",     value: `${SUMMARY.avg_accuracy}%`, Icon: TrendingUp, color: "blue" },
          { label: "Best Streak",      value: `${SUMMARY.best_streak}d`, Icon: Flame,  color: "amber"  },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-2xl bg-[#141414] border border-white/8 p-4">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center mb-3",
              color === "violet"  ? "bg-violet-500/10" :
              color === "emerald" ? "bg-emerald-500/10" :
              color === "blue"    ? "bg-blue-500/10"    : "bg-amber-500/10"
            )}>
              <Icon size={15} className={cn(
                color === "violet"  ? "text-violet-400" :
                color === "emerald" ? "text-emerald-400" :
                color === "blue"    ? "text-blue-400"    : "text-amber-400"
              )} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Left col */}
        <div className="xl:col-span-3 space-y-4">
          {/* Trend chart */}
          <div className="rounded-2xl bg-[#141414] border border-white/8 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Performance Trend</p>
                <p className="text-sm text-gray-300 mt-0.5">Accuracy over time</p>
              </div>
            </div>
            {!mounted ? (
              <div className="h-[180px]" />
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
                  <Area
                    type="monotone" dataKey="score"
                    stroke="#7c3aed" strokeWidth={2}
                    fill="url(#anaGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#7c3aed", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Session history table */}
          <div className="rounded-2xl bg-[#141414] border border-white/8 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/8">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recent Sessions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Date", "Duration", "Cards", "Accuracy", "Grade"].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-gray-500 px-5 py-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {SESSIONS.map((s, i) => {
                    const grade      = s.accuracy >= 90 ? "Excellent" : s.accuracy >= 70 ? "Good" : s.accuracy >= 50 ? "Fair" : "Poor";
                    const gradeColor = s.accuracy >= 90 ? "text-emerald-400" : s.accuracy >= 70 ? "text-blue-400" : s.accuracy >= 50 ? "text-amber-400" : "text-red-400";
                    return (
                      <tr key={i} className="hover:bg-white/2 transition-colors">
                        <td className="px-5 py-3 text-gray-300">{s.date}</td>
                        <td className="px-5 py-3 text-gray-400">{s.duration}m</td>
                        <td className="px-5 py-3 text-gray-400">{s.cards}</td>
                        <td className="px-5 py-3 text-gray-300 font-medium">{s.accuracy}%</td>
                        <td className={cn("px-5 py-3 text-xs font-medium", gradeColor)}>{grade}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className="xl:col-span-2 space-y-4">
          {/* Domain mastery */}
          <div className="rounded-2xl bg-[#141414] border border-white/8 p-5">
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Domain Mastery</p>
              <p className="text-sm text-gray-300 mt-0.5">Sorted by strength</p>
            </div>
            <div className="space-y-4">
              {DOMAINS.map(({ topic, score, change }) => {
                const barColor  = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
                const textColor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
                const ChangeIcon  = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
                const changeColor = change > 0 ? "text-emerald-400" : change < 0 ? "text-red-400" : "text-gray-600";
                return (
                  <div key={topic}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-gray-300 truncate max-w-[55%]">{topic}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn("flex items-center gap-0.5 text-xs", changeColor)}>
                          <ChangeIcon size={10} />
                          {change !== 0 && `${Math.abs(change)}%`}
                        </span>
                        <span className={cn("text-xs font-semibold", textColor)}>{score}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", barColor)} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly study pattern */}
          <div className="rounded-2xl bg-[#141414] border border-white/8 p-5">
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Pattern</p>
              <p className="text-sm text-gray-300 mt-0.5">Avg minutes per day</p>
            </div>
            <div className="space-y-2.5">
              {WEEKLY_PATTERN.map(({ day, mins }) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-7 shrink-0">{day}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{ width: `${(mins / 60) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right shrink-0">{mins}m</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
