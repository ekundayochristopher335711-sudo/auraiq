"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, BookOpen, BarChart3, Target,
  Brain, Settings, LogOut, Zap, X, Sun, Moon, Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/subjects",   label: "Subjects",   icon: BookOpen        },
  { href: "/flashcards", label: "Flashcards", icon: Zap             },
  { href: "/analytics",  label: "Analytics",  icon: BarChart3       },
  { href: "/exam-sim",   label: "Exam Sim",   icon: Target          },
  { href: "/ai-tutor",   label: "AI Tutor",   icon: Brain           },
];

type Theme = "dark" | "light" | "system";

function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem("auraiq-theme") as Theme | null;
    setTheme(saved ?? "system");
  }, []);

  const apply = (t: Theme) => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (t === "dark" || (t === "system" && prefersDark)) root.classList.add("dark");
    else root.classList.remove("dark");
    if (t === "system") localStorage.removeItem("auraiq-theme");
    else localStorage.setItem("auraiq-theme", t);
    setTheme(t);
  };

  return { theme, apply };
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, apply } = useTheme();

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";
  const isPro = user?.plan === "pro" || user?.plan === "enterprise";

  const cycleTheme = () => {
    if (theme === "system") apply("dark");
    else if (theme === "dark") apply("light");
    else apply("system");
  };

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        id="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-56 border-r border-white/8 py-5 px-3 shrink-0 transition-transform duration-300",
          "bg-[#0d0d0d]",
          "lg:relative lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo + close on mobile */}
        <div className="flex items-center justify-between px-2 mb-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Brain size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">AuraIQ</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
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
          {/* Settings */}
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-all"
          >
            <Settings size={16} />
            Settings
          </Link>

          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-all"
          >
            <ThemeIcon size={16} />
            {theme === "dark" ? "Dark mode" : theme === "light" ? "Light mode" : "System"}
          </button>

          {/* Upgrade banner */}
          {!isPro && (
            <div className="mt-3 rounded-xl bg-violet-600/10 border border-violet-500/20 p-3">
              <p className="text-xs font-semibold text-violet-300 mb-1">Upgrade to Pro</p>
              <p className="text-xs text-gray-500 mb-2">Unlock AI Tutor, Exam Sim & more</p>
              <button className="w-full text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-1.5 font-medium transition-colors">
                Upgrade Plan
              </button>
            </div>
          )}

          {/* User row */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl mt-2 group">
            <div className="w-7 h-7 rounded-full bg-linear-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
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
    </>
  );
}
