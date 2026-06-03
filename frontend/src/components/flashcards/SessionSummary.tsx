"use client";
import Link from "next/link";
import { Trophy, Zap, Target, RotateCcw, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionSummaryProps {
  total: number;
  correct: number;
  durationSeconds: number;
  onRestart: () => void;
}

export function SessionSummary({ total, correct, durationSeconds, onRestart }: SessionSummaryProps) {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const mins = Math.floor(durationSeconds / 60);
  const secs = durationSeconds % 60;

  const grade =
    accuracy >= 90 ? { label: "Excellent!", color: "text-emerald-400", icon: "🏆" } :
    accuracy >= 70 ? { label: "Good Work!", color: "text-blue-400",    icon: "⚡" } :
    accuracy >= 50 ? { label: "Keep Going", color: "text-amber-400",   icon: "💪" } :
                     { label: "Need Practice", color: "text-red-400",  icon: "📚" };

  const stats = [
    { label: "Cards Reviewed", value: total,       icon: Zap,    color: "text-violet-400" },
    { label: "Correct",        value: correct,      icon: Target, color: "text-emerald-400" },
    { label: "Accuracy",       value: `${accuracy}%`, icon: Trophy, color: accuracy >= 70 ? "text-emerald-400" : "text-amber-400" },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
      {/* Grade */}
      <div className="text-center space-y-2">
        <div className="text-5xl mb-2">{grade.icon}</div>
        <h2 className={cn("text-3xl font-bold", grade.color)}>{grade.label}</h2>
        <p className="text-gray-500 text-sm">
          Session complete · {mins}m {secs}s
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl bg-[#141414] border border-white/8 p-4 flex flex-col items-center gap-1.5">
            <Icon size={16} className={color} />
            <p className={cn("text-xl font-bold", color)}>{value}</p>
            <p className="text-xs text-gray-600 text-center">{label}</p>
          </div>
        ))}
      </div>

      {/* Accuracy ring */}
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="#1f1f1f" strokeWidth="5" />
          <circle
            cx="28" cy="28" r="24"
            fill="none"
            stroke={accuracy >= 70 ? "#10b981" : accuracy >= 50 ? "#f59e0b" : "#ef4444"}
            strokeWidth="5"
            strokeDasharray={`${(accuracy / 100) * 2 * Math.PI * 24} ${2 * Math.PI * 24}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{accuracy}%</span>
          <span className="text-xs text-gray-500">accuracy</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
        <button
          onClick={onRestart}
          className="w-full flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 hover:bg-white/5 text-gray-300 rounded-xl py-3 text-sm font-medium transition-all"
        >
          <RotateCcw size={14} /> Review Again
        </button>
        <Link
          href="/dashboard"
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
        >
          <LayoutDashboard size={14} /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
