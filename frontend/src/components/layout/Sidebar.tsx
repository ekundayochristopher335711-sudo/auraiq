"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BookOpen, BarChart3, Target,
  Brain, Settings, LogOut, Zap, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/subjects", label: "Subjects", icon: BookOpen },
  { href: "/flashcards", label: "Flashcards", icon: Zap },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/exam-sim", label: "Exam Sim", icon: Target },
  { href: "/ai-tutor", label: "AI Tutor", icon: Brain },
];

const BOTTOM_ITEMS = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const isPro = user?.plan === "pro" || user?.plan === "enterprise";

  return (
    <aside className="flex flex-col h-screen w-56 bg-[#0d0d0d] border-r border-white/8 py-5 px-3 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <Brain size={16} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">AuraIQ</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-violet-600/20 text-violet-400"
                  : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
              )}
            >
              <Icon size={16} className={active ? "text-violet-400" : "text-gray-500"} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="space-y-0.5">
        {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-all"
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}

        {/* Upgrade Banner — only for free users */}
        {!isPro && (
          <div className="mt-4 rounded-xl bg-violet-600/10 border border-violet-500/20 p-3">
            <p className="text-xs font-semibold text-violet-300 mb-1">Upgrade to Pro</p>
            <p className="text-xs text-gray-500 mb-2">Unlock AI Tutor, Exam Sim & more</p>
            <button className="w-full text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-1.5 font-medium transition-colors">
              Upgrade Plan
            </button>
          </div>
        )}

        {/* User row */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mt-2 group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-200 truncate">{user?.full_name ?? "Loading..."}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.plan ?? "free"} plan</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
