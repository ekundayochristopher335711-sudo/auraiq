"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, Play, Clock, BookOpen, ChevronRight } from "lucide-react";
import { api, Flashcard } from "@/lib/api";
import { MOCK_CARDS } from "@/lib/mockCards";
import { cn } from "@/lib/utils";

const diffColor: Record<string, string> = {
  easy:   "text-emerald-400 bg-emerald-500/10",
  medium: "text-amber-400   bg-amber-500/10",
  hard:   "text-red-400     bg-red-500/10",
};

function CardRow({ card }: { card: Flashcard }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-white/3 transition-colors group">
      <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
        <Zap size={14} className="text-violet-400" />
      </div>
      <p className="flex-1 text-sm text-gray-300 line-clamp-1">{card.question}</p>
      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", diffColor[card.difficulty])}>
        {card.difficulty}
      </span>
    </div>
  );
}

export default function FlashcardsPage() {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.flashcards.due()
      .then(setCards)
      .catch(() => setCards(MOCK_CARDS))
      .finally(() => setLoading(false));
  }, []);

  const easy   = cards.filter((c) => c.difficulty === "easy").length;
  const medium = cards.filter((c) => c.difficulty === "medium").length;
  const hard   = cards.filter((c) => c.difficulty === "hard").length;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Flashcards</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? "Loading..." : `${cards.length} card${cards.length !== 1 ? "s" : ""} due for review`}
          </p>
        </div>
        {cards.length > 0 && (
          <Link
            href="/flashcards/session"
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors"
          >
            <Play size={14} /> Start Session
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Easy",   count: easy,   color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
          { label: "Medium", count: medium, color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20"   },
          { label: "Hard",   count: hard,   color: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20"     },
        ].map(({ label, count, color, bg, border }) => (
          <div key={label} className={cn("rounded-2xl border p-4 text-center", bg, border)}>
            <p className={cn("text-2xl font-bold", color)}>{count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Card list */}
      <div className="rounded-2xl bg-[#141414] border border-white/8 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Due Cards</p>
          {cards.length > 0 && (
            <Link href="/flashcards/session" className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Review all <ChevronRight size={12} />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="space-y-1 p-2">
            {[1,2,3,4].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-white/3 animate-pulse" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <Clock size={20} className="text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">All caught up!</p>
            <p className="text-xs text-gray-500 mb-4">No cards due right now. Add subjects to build your deck.</p>
            <Link
              href="/subjects"
              className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              <BookOpen size={12} /> Go to Subjects
            </Link>
          </div>
        ) : (
          <div className="p-2 divide-y divide-white/4">
            {cards.slice(0, 20).map((c) => <CardRow key={c.id} card={c} />)}
            {cards.length > 20 && (
              <p className="text-xs text-center text-gray-600 py-3">+{cards.length - 20} more cards</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
