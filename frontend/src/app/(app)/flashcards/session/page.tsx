"use client";
import { useEffect, useRef, useState } from "react";
import { api, Flashcard } from "@/lib/api";
import { FlipCard } from "@/components/flashcards/FlipCard";
import { RatingBar } from "@/components/flashcards/RatingBar";
import { SessionProgress } from "@/components/flashcards/SessionProgress";
import { SessionSummary } from "@/components/flashcards/SessionSummary";

type Phase = "reviewing" | "rating" | "done";

export default function SessionPage() {
  const [cards, setCards]         = useState<Flashcard[]>([]);
  const [index, setIndex]         = useState(0);
  const [phase, setPhase]         = useState<Phase>("reviewing");
  const [correct, setCorrect]     = useState(0);
  const [loading, setLoading]     = useState(true);
  const [rating, setRating]       = useState(false);
  const startTime                 = useRef(Date.now());
  const sessionLogged             = useRef(false);

  useEffect(() => {
    api.flashcards.due()
      .then(setCards)
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }, []);

  const current = cards[index];
  const isLast  = index === cards.length - 1;

  const handleReveal = (revealed: boolean) => {
    if (revealed) setPhase("rating");
  };

  const handleRate = async (quality: number) => {
    if (rating) return;
    setRating(true);

    const isCorrect = quality >= 3;
    if (isCorrect) setCorrect((c) => c + 1);

    // Fire-and-forget SM-2 update — don't block the UI
    if (current.id > 0) {
      api.flashcards.review(current.id, quality).catch(() => {});
    }

    if (isLast) {
      await finishSession(isCorrect ? correct + 1 : correct);
    } else {
      setIndex((i) => i + 1);
      setPhase("reviewing");
      setRating(false);
    }
  };

  const finishSession = async (finalCorrect: number) => {
    const durationMins = Math.round((Date.now() - startTime.current) / 60000);
    if (!sessionLogged.current) {
      sessionLogged.current = true;
      api.sessions.create({
        duration_minutes: durationMins,
        cards_reviewed: cards.length,
        correct_answers: finalCorrect,
      }).catch(() => {});
    }
    setPhase("done");
    setRating(false);
  };

  const restart = () => {
    setIndex(0);
    setCorrect(0);
    setPhase("reviewing");
    setRating(false);
    sessionLogged.current = false;
    startTime.current = Date.now();
  };

  const elapsed = Math.round((Date.now() - startTime.current) / 1000);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-white font-semibold">No cards due</p>
        <p className="text-sm text-gray-500">Upload a document on the Subjects page to generate flashcards.</p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <SessionSummary
          total={cards.length}
          correct={correct}
          durationSeconds={elapsed}
          onRestart={restart}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Progress header */}
      <div className="p-4 max-w-xl mx-auto w-full">
        <SessionProgress
          current={index}
          total={cards.length}
          correct={correct}
        />
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 gap-6 max-w-xl mx-auto w-full">
        {/* Difficulty badge */}
        <div className="flex items-center gap-2 self-start">
          <span className={`text-xs px-2 py-1 rounded-full font-medium
            ${current.difficulty === "easy"   ? "bg-emerald-500/10 text-emerald-400" :
              current.difficulty === "hard"   ? "bg-red-500/10 text-red-400" :
                                                "bg-amber-500/10 text-amber-400"}`}>
            {current.difficulty}
          </span>
          <span className="text-xs text-gray-600">Card {index + 1} of {cards.length}</span>
        </div>

        {/* Flip card */}
        <FlipCard
          key={current.id}
          question={current.question}
          answer={current.answer}
          onFlip={handleReveal}
        />

        {/* Rating — only shown after card is flipped */}
        <div className={`w-full transition-all duration-300 ${phase === "rating" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
          <RatingBar onRate={handleRate} disabled={rating} />
        </div>

        {/* Tap hint — only when card is not yet flipped */}
        {phase === "reviewing" && (
          <p className="text-xs text-gray-600 animate-pulse">Tap the card to reveal the answer</p>
        )}
      </div>
    </div>
  );
}
