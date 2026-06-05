"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { User, Shield, LogOut, Zap, Flame, Camera, Loader2, X, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

const PLAN_CONFIG = {
  free:       { label: "Free",       color: "bg-gray-500/10 text-gray-400",    border: "border-gray-500/20"   },
  pro:        { label: "Pro",        color: "bg-violet-500/10 text-violet-400", border: "border-violet-500/20" },
  enterprise: { label: "Enterprise", color: "bg-amber-500/10 text-amber-400",   border: "border-amber-500/20"  },
};

const PRO_FEATURES = [
  "Unlimited document uploads",
  "Live AI Tutor sessions (no daily cap)",
  "Advanced analytics & weakness heatmap",
  "Priority AI processing speed",
  "Export flashcards to Anki / PDF",
  "Collaborative study rooms",
];

function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-linear-to-br from-violet-600 to-purple-700 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-violet-200 uppercase tracking-wider mb-1">Upgrade to</p>
              <h2 className="text-2xl font-bold text-white">AuraIQ Pro</h2>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-violet-100 mt-2">Everything you need to master any subject faster.</p>
        </div>
        <div className="p-6 space-y-4">
          <ul className="space-y-3">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                <CheckCircle size={15} className="text-violet-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="border-t border-white/8 pt-4">
            <p className="text-center text-xs text-gray-500 mb-3">Billing handled securely via Stripe</p>
            <a
              href="mailto:support@auraiq.app?subject=Pro%20Upgrade"
              className="flex items-center justify-center gap-2 w-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl py-3 transition-colors"
            >
              <Zap size={15} /> Contact us to upgrade
            </a>
            <button onClick={onClose} className="w-full mt-2 text-xs text-gray-500 hover:text-gray-300 py-2 transition-colors">
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [showUpgrade, setShowUpgrade] = useState(false);
  // Seed from user.avatar_url so it persists across refreshes
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(user?.avatar_url ?? null);
  const [uploading, setUploading]     = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-sync if the user object loads after first render (auth is async)
  useEffect(() => {
    if (user?.avatar_url && !avatarUrl) setAvatarUrl(user.avatar_url);
  }, [user?.avatar_url]);

  const plan   = (user?.plan ?? "free") as keyof typeof PLAN_CONFIG;
  const badge  = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free;
  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setAvatarError("Image must be under 5 MB."); return; }
    if (!file.type.startsWith("image/")) { setAvatarError("Please select an image file."); return; }

    setAvatarError("");
    setUploading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      const ext  = file.name.split(".").pop() ?? "jpg";
      const path = `${authUser.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", authUser.id);
      setAvatarUrl(publicUrl);
    } catch (err: any) {
      setAvatarError(err.message ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      <div className="p-4 sm:p-6 max-w-2xl space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your account and preferences</p>
        </div>

        {/* Profile card */}
        <div className="rounded-2xl bg-[#141414] border border-white/8 p-6">
          <div className="flex items-center gap-4 mb-5">
            {/* Avatar with upload */}
            <div className="relative shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className="w-16 h-16 rounded-full overflow-hidden cursor-pointer group relative"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-linear-to-br from-violet-500 to-pink-500 flex items-center justify-center text-xl font-bold text-white">
                    {initials}
                  </div>
                )}
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading
                    ? <Loader2 size={18} className="text-white animate-spin" />
                    : <Camera size={18} className="text-white" />}
                </div>
              </div>
              {/* Small camera badge */}
              <button
                onClick={() => !uploading && fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-violet-600 hover:bg-violet-500 border-2 border-[#141414] rounded-full flex items-center justify-center transition-colors disabled:opacity-60"
              >
                {uploading
                  ? <Loader2 size={10} className="text-white animate-spin" />
                  : <Camera size={10} className="text-white" />}
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-white truncate">{user?.full_name ?? "—"}</p>
              <p className="text-sm text-gray-400 truncate">{user?.email ?? "—"}</p>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block border", badge.color, badge.border)}>
                {badge.label} Plan
              </span>
            </div>
          </div>

          {avatarError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mb-4">{avatarError}</p>
          )}

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
            <button
              onClick={() => setShowUpgrade(true)}
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl px-5 py-2 transition-colors"
            >
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
    </>
  );
}
