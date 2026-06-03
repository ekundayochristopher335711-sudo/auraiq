"use client";
import { cn } from "@/lib/utils";

interface Rating {
  label: string;
  quality: number;
  color: string;
  bg: string;
  border: string;
  hint: string;
}

const RATINGS: Rating[] = [
  { label: "Again",  quality: 0, color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/30",    hint: "Complete blank" },
  { label: "Hard",   quality: 2, color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", hint: "Recalled with difficulty" },
  { label: "Good",   quality: 4, color: "text-blue-400",   bg: "bg-blue-500/10",   border: "border-blue-500/30",   hint: "Recalled correctly" },
  { label: "Easy",   quality: 5, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", hint: "Instant recall" },
];

interface RatingBarProps {
  onRate: (quality: number) => void;
  disabled?: boolean;
}

export function RatingBar({ onRate, disabled }: RatingBarProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-center text-gray-600">How well did you know this?</p>
      <div className="grid grid-cols-4 gap-2">
        {RATINGS.map((r) => (
          <button
            key={r.label}
            onClick={() => onRate(r.quality)}
            disabled={disabled}
            className={cn(
              "flex flex-col items-center gap-1 py-3 rounded-xl border font-medium transition-all disabled:opacity-40 disabled:pointer-events-none hover:scale-105 active:scale-95",
              r.bg, r.border, r.color
            )}
          >
            <span className="text-sm">{r.label}</span>
            <span className="text-xs opacity-60 hidden sm:block">{r.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
