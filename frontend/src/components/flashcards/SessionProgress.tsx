"use client";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

interface SessionProgressProps {
  current: number;
  total: number;
  correct: number;
}

export function SessionProgress({ current, total, correct }: SessionProgressProps) {
  const router = useRouter();
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const accuracy = current > 0 ? Math.round((correct / current) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (confirm("Exit session? Your progress will be lost.")) router.push("/flashcards");
          }}
          className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-all"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">
            <span className="text-white font-semibold">{current}</span>/{total}
          </span>
          <span className="text-emerald-400 font-semibold">{accuracy}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-violet-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
