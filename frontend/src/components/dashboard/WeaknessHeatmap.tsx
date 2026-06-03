"use client";
import { cn } from "@/lib/utils";

interface TopicScore {
  topic: string;
  score: number;
  status: "strong" | "moderate" | "weak";
}

interface WeaknessHeatmapProps {
  topics: TopicScore[];
}

export function WeaknessHeatmap({ topics }: WeaknessHeatmapProps) {
  const statusConfig = {
    strong: { bar: "bg-emerald-500", text: "text-emerald-400", label: "Strong" },
    moderate: { bar: "bg-amber-500", text: "text-amber-400", label: "Moderate" },
    weak: { bar: "bg-red-500", text: "text-red-400", label: "Weak" },
  };

  const displayed = topics.length > 0 ? topics : [
    { topic: "No subjects yet", score: 0, status: "weak" as const },
  ];

  return (
    <div className="rounded-2xl bg-[#141414] border border-white/8 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Weakness Heatmap</p>
          <p className="text-sm text-gray-300 mt-0.5">Topic mastery overview</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Strong</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Moderate</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Weak</span>
        </div>
      </div>

      <div className="space-y-3">
        {displayed.map((t) => {
          const cfg = statusConfig[t.status];
          return (
            <div key={t.topic}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-300 truncate max-w-[60%]">{t.topic}</span>
                <span className={cn("text-xs font-medium", cfg.text)}>{Math.round(t.score)}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", cfg.bar)}
                  style={{ width: `${t.score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
