"use client";
import { Calendar, Shield, RefreshCcw, Plus, Flame, BookOpen, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface ScheduledActionsProps {
  cardsDue: number;
  streak: number;
  subjects: { id: number; title: string; mastery_score: number }[];
  lastSessionDate?: string | null;
}

export function ScheduledActions({ cardsDue, streak, subjects, lastSessionDate }: ScheduledActionsProps) {
  const actions: { icon: React.ElementType; label: string; detail: string; color: string; href: string; urgent?: boolean }[] = [];

  // 1. Cards due — highest priority
  if (cardsDue > 0) {
    actions.push({
      icon: RefreshCcw,
      label: `Review ${cardsDue} due card${cardsDue !== 1 ? "s" : ""}`,
      detail: "Spaced repetition cards ready for review",
      color: "text-violet-400",
      href: "/flashcards",
      urgent: true,
    });
  }

  // 2. Streak at risk — show if they have a streak but haven't reviewed today
  const reviewedToday = lastSessionDate
    ? new Date(lastSessionDate).toDateString() === new Date().toDateString()
    : false;

  if (streak > 0 && !reviewedToday) {
    actions.push({
      icon: Flame,
      label: `Protect your ${streak}-day streak`,
      detail: "Complete at least one review today to keep it",
      color: "text-amber-400",
      href: "/flashcards",
      urgent: streak >= 3,
    });
  }

  // 3. Weakest subject — encourage focused study
  const weakest = [...subjects].sort((a, b) => a.mastery_score - b.mastery_score)[0];
  if (weakest && weakest.mastery_score < 0.75) {
    const pct = Math.round(weakest.mastery_score * 100);
    actions.push({
      icon: AlertTriangle,
      label: `Strengthen "${weakest.title}"`,
      detail: `Mastery at ${pct}% — needs focused practice`,
      color: "text-red-400",
      href: "/subjects",
    });
  }

  // 4. No subjects yet — onboarding action
  if (subjects.length === 0) {
    actions.push({
      icon: BookOpen,
      label: "Create your first subject",
      detail: "Upload study material to get started",
      color: "text-blue-400",
      href: "/subjects",
    });
  }

  // 5. Strong performance — positive reinforcement
  if (subjects.length > 0 && subjects.every((s) => s.mastery_score >= 0.75) && cardsDue === 0) {
    actions.push({
      icon: Shield,
      label: "All subjects looking strong!",
      detail: "Keep reviewing daily to maintain mastery",
      color: "text-emerald-400",
      href: "/flashcards",
    });
  }

  // 6. Add subject prompt if they have < 3
  if (subjects.length > 0 && subjects.length < 3) {
    actions.push({
      icon: Calendar,
      label: "Expand your study plan",
      detail: `You have ${subjects.length} subject${subjects.length !== 1 ? "s" : ""} — add more topics`,
      color: "text-blue-400",
      href: "/subjects",
    });
  }

  const displayed = actions.slice(0, 3);

  return (
    <div className="rounded-2xl bg-[#141414] border border-white/8 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Actions</p>
        <Link href="/subjects"
          className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <Plus size={13} className="text-gray-400" />
        </Link>
      </div>

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <p className="text-sm text-gray-500">No actions right now</p>
          <p className="text-xs text-gray-600 mt-1">Complete a review session to see recommendations</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayed.map(({ icon: Icon, label, detail, color, href, urgent }) => (
            <Link key={label} href={href}
              className="flex items-center gap-3 group rounded-xl hover:bg-white/4 px-1 py-1 -mx-1 transition-colors">
              <div className={`w-8 h-8 rounded-lg bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors shrink-0 ${urgent ? "ring-1 ring-violet-500/30" : ""}`}>
                <Icon size={14} className={color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 font-medium truncate">{label}</p>
                <p className="text-xs text-gray-500 truncate">{detail}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
