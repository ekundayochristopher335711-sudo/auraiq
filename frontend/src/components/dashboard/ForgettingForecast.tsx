import { Clock, AlertTriangle, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Forecast {
  concept: string;
  subject: string;
  hours_until_forgotten: number;
  urgency: "critical" | "high" | "medium";
}

interface ForgettingForecastProps {
  forecasts: Forecast[];
  queueCount: number;
}

const urgencyConfig = {
  critical: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Review Now" },
  high: { icon: Zap, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", label: "Review Soon" },
  medium: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Due Today" },
};

export function ForgettingForecast({ forecasts, queueCount }: ForgettingForecastProps) {
  return (
    <div className="rounded-2xl bg-[#141414] border border-white/8 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Forgetting Forecast™</p>
          <p className="text-sm text-gray-300 mt-0.5">{queueCount} cards due for review</p>
        </div>
        <Link href="/flashcards" className="text-xs bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 px-3 py-1.5 rounded-lg font-medium transition-colors">
          Start Review
        </Link>
      </div>

      {forecasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
            <Zap size={18} className="text-emerald-400" />
          </div>
          <p className="text-sm text-gray-300 font-medium">All caught up!</p>
          <p className="text-xs text-gray-500 mt-1">No concepts at risk right now</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {forecasts.map((f, i) => {
            const cfg = urgencyConfig[f.urgency as keyof typeof urgencyConfig] ?? urgencyConfig.medium;
            const Icon = cfg.icon;
            return (
              <div key={i} className={cn("flex items-center gap-3 rounded-xl p-3 border", cfg.bg, cfg.border)}>
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                  <Icon size={15} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{f.concept}</p>
                  <p className="text-xs text-gray-500">{f.subject} · {f.hours_until_forgotten}h left</p>
                </div>
                <span className={cn("text-xs font-semibold shrink-0", cfg.color)}>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
