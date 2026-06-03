"use client";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlipCardProps {
  question: string;
  answer: string;
  onFlip?: (revealed: boolean) => void;
}

export function FlipCard({ question, answer, onFlip }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);

  const flip = () => {
    setFlipped((f) => {
      onFlip?.(!f);
      return !f;
    });
  };

  return (
    <div
      className="w-full cursor-pointer select-none"
      style={{ perspective: "1200px" }}
      onClick={flip}
    >
      <div
        className="relative w-full transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          minHeight: "280px",
        }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl bg-[#141414] border border-white/10 flex flex-col items-center justify-center p-8 gap-4"
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-xs font-medium text-violet-400 uppercase tracking-widest">Question</span>
          <p className="text-xl font-semibold text-white text-center leading-relaxed">{question}</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-2">
            <RotateCcw size={11} />
            tap to reveal answer
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl bg-[#141414] border border-violet-500/30 flex flex-col items-center justify-center p-8 gap-4"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-widest">Answer</span>
          <p className="text-lg text-gray-200 text-center leading-relaxed">{answer}</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-2">
            <RotateCcw size={11} />
            tap to flip back
          </div>
        </div>
      </div>
    </div>
  );
}
