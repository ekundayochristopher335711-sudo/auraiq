"use client";
import { useAuth } from "@/context/AuthContext";
import { User, Shield, LogOut, Zap, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

const PLAN_CONFIG = {
  free:       { label: "Free",       color: "bg-gray-500/10 text-gray-400",   border: "border-gray-500/20"   },
  pro:        { label: "Pro",        color: "bg-violet-500/10 text-violet-400", border: "border-violet-500/20" },
  enterprise: { label: "Enterprise", color: "bg-amber-500/10 text-amber-400",  border: "border-amber-500/20"  },
};

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const plan   = (user?.plan ?? "free") as keyof typeof PLAN_CONFIG;
  const badge  = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free;
  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="p-6 max-w-2xl space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile card */}
      <div className="rounded-2xl bg-[#141414] border border-white/8 p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xl font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold text-white truncate">{user?.full_name ?? "—"}</p>
            <p className="text-sm text-gray-400 truncate">{user?.email ?? "—"}</p>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block border", badge.color, badge.border)}>
              {badge.label} Plan
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/3 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Flame size={14} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Study Streak</p>
              <p className="text-sm font-semibold text-white">{user?.study_streak ?? 0} days</p>
            </div>
          </div>
          <div className="bg-white/3 rounded-xl p-3 flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", badge.color.split(" ")[0])}>
              <Zap size={14} className={badge.color.split(" ")[1]} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Current Plan</p>
              <p className="text-sm font-semibold text-white">{badge.label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account info */}
      <div className="rounded-2xl bg-[#141414] border border-white/8 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/8">
          <User size={13} className="text-gray-500" />
          <p className="text-sm font-medium text-gray-300">Account</p>
        </div>
        <div className="divide-y divide-white/5">
          {[
            { label: "Full Name",     value: user?.full_name ?? "—" },
            { label: "Email Address", value: user?.email ?? "—"     },
            { label: "Plan",          value: badge.label             },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3.5">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-sm text-gray-200">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade banner — free users only */}
      {plan === "free" && (
        <div className="rounded-2xl bg-violet-600/10 border border-violet-500/20 p-5">
          <p className="text-sm font-semibold text-violet-300 mb-1">Upgrade to Pro</p>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            Unlock live AI Tutor sessions, unlimited document uploads, and advanced analytics.
          </p>
          <button className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl px-5 py-2 transition-colors">
            Upgrade Now
          </button>
        </div>
      )}

      {/* Danger zone */}
      <div className="rounded-2xl bg-[#141414] border border-white/8 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/8">
          <Shield size={13} className="text-gray-500" />
          <p className="text-sm font-medium text-gray-300">Account Actions</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-red-400 hover:bg-red-500/5 transition-colors"
        >
          <LogOut size={14} />
          Sign Out of AuraIQ
        </button>
      </div>
    </div>
  );
}
