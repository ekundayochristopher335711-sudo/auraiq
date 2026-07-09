"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Zap, Flame, Target, BookOpen, CheckCheck, X, Trash2, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NotificationBellProps {
  cardsDue: number;
  streak: number;
  reviewedToday: boolean;
  weakSubjects: { id: number; title: string }[];
  isNewUser: boolean;
  lastAccuracy: number | null;
}

interface Notif {
  id: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  title: string;
  detail: string;
  href: string;
}

// Read/dismissed state lives in localStorage (per device — fine at pilot scale).
// IDs are date-stamped so daily notifications re-appear fresh each day.
const LS_KEY = "recalro_notifications";

interface NotifState { read: string[]; dismissed: string[] }

function loadState(): NotifState {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) ?? "null");
    if (raw && Array.isArray(raw.read) && Array.isArray(raw.dismissed)) return raw;
  } catch { /* corrupted — reset */ }
  return { read: [], dismissed: [] };
}

function saveState(s: NotifState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ read: s.read.slice(-150), dismissed: s.dismissed.slice(-150) }));
  } catch { /* storage full */ }
}

export function NotificationBell({ cardsDue, streak, reviewedToday, weakSubjects, isNewUser, lastAccuracy }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [state, setState] = useState<NotifState>({ read: [], dismissed: [] });

  useEffect(() => { setState(loadState()); }, []);

  const today = new Date().toISOString().slice(0, 10);

  const all: Notif[] = useMemo(() => {
    const list: Notif[] = [];

    if (isNewUser) {
      list.push({
        id: "welcome",
        icon: BookOpen, color: "text-blue-400", bg: "bg-blue-500/15",
        title: "Welcome to Recalro!",
        detail: "Upload your first study document to get started",
        href: "/subjects",
      });
    }
    if (cardsDue > 0) {
      list.push({
        id: `due-${today}`,
        icon: Zap, color: "text-violet-400", bg: "bg-violet-500/15",
        title: `${cardsDue} card${cardsDue !== 1 ? "s" : ""} due for review`,
        detail: "Tap to start your review session",
        href: "/flashcards",
      });
    }
    if (streak > 0 && !reviewedToday) {
      list.push({
        id: `streak-${today}`,
        icon: Flame, color: "text-amber-400", bg: "bg-amber-500/15",
        title: `Your ${streak}-day streak is at risk`,
        detail: "Complete one review today to keep it alive",
        href: "/flashcards",
      });
    }
    for (const s of weakSubjects.slice(0, 3)) {
      list.push({
        id: `weak-${s.id}-${today}`,
        icon: Target, color: "text-red-400", bg: "bg-red-500/15",
        title: `"${s.title}" needs attention`,
        detail: "Mastery is low — review it or take a practice exam",
        href: `/subjects/${s.id}`,
      });
    }
    if (lastAccuracy !== null && lastAccuracy >= 0.8) {
      list.push({
        id: `great-${today}`,
        icon: Trophy, color: "text-emerald-400", bg: "bg-emerald-500/15",
        title: `Great session — ${Math.round(lastAccuracy * 100)}% accuracy`,
        detail: "Keep the momentum going",
        href: "/analytics",
      });
    }

    return list.filter((n) => !state.dismissed.includes(n.id));
  }, [cardsDue, streak, reviewedToday, weakSubjects, isNewUser, lastAccuracy, state.dismissed, today]);

  const unread = all.filter((n) => !state.read.includes(n.id));
  const shown = tab === "unread" ? unread : all;

  const update = (s: NotifState) => { setState(s); saveState(s); };
  const markRead = (id: string) => {
    if (!state.read.includes(id)) update({ ...state, read: [...state.read, id] });
  };
  const markAllRead = () =>
    update({ ...state, read: [...new Set([...state.read, ...all.map((n) => n.id)])] });
  const dismiss = (id: string) => update({ ...state, dismissed: [...state.dismissed, id] });
  const clearAll = () => update({ ...state, dismissed: [...state.dismissed, ...all.map((n) => n.id)] });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 rounded-xl bg-[#141414] border border-white/8 flex items-center justify-center hover:bg-white/5 transition-colors"
        title="Notifications"
      >
        <Bell size={15} className="text-gray-400" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-80 max-w-[calc(100vw-2rem)] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-3 pb-2 border-b border-white/8">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">Notifications</p>
                {unread.length > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
              </div>
              {/* Tabs */}
              <div className="flex gap-1">
                {(["all", "unread"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors",
                      tab === t ? "bg-violet-600/20 text-violet-300" : "text-gray-500 hover:text-gray-300"
                    )}
                  >
                    {t}{t === "unread" && unread.length > 0 ? ` (${unread.length})` : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {shown.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center px-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                    <Zap size={16} className="text-emerald-400" />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">
                    {tab === "unread" ? "No unread notifications" : "You're all caught up!"}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">New alerts appear here as your study data changes.</p>
                </div>
              ) : shown.map((n) => {
                const isUnread = !state.read.includes(n.id);
                const Icon = n.icon;
                return (
                  <div key={n.id} className="group relative">
                    <Link
                      href={n.href}
                      onClick={() => { markRead(n.id); setOpen(false); }}
                      className={cn(
                        "flex items-start gap-3 px-3 py-3 rounded-xl transition-colors",
                        isUnread ? "bg-white/[0.04] hover:bg-white/[0.07]" : "hover:bg-white/5 opacity-75"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", n.bg)}>
                        <Icon size={14} className={n.color} />
                      </div>
                      <div className="min-w-0 pr-6">
                        <p className="text-sm text-gray-200 font-medium flex items-center gap-1.5">
                          <span className="truncate">{n.title}</span>
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.detail}</p>
                        <p className="text-[10px] text-gray-600 mt-1">Today</p>
                      </div>
                    </Link>
                    {/* Dismiss */}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss(n.id); }}
                      title="Dismiss"
                      className="absolute top-2.5 right-2.5 w-5 h-5 rounded-md flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            {all.length > 0 && (
              <div className="border-t border-white/8 px-2 py-1.5">
                <button
                  onClick={clearAll}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-red-400 rounded-lg py-1.5 hover:bg-red-500/5 transition-colors"
                >
                  <Trash2 size={12} /> Clear all
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
