"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain, Eye, EyeOff, Loader2, AlertCircle, Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

const PASSWORD_RULES = [
  { label: "At least 8 characters",  test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",    test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number",              test: (p: string) => /\d/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName]       = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const strength      = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const strengthLabel = ["", "Weak", "Fair", "Strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-amber-500", "bg-emerald-500"][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (strength < 2) { setError("Please choose a stronger password."); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;

      if (data?.session?.access_token) {
        router.push("/dashboard");
      } else {
        router.push("/login?registered=1");
      }
    } catch (err: any) {
      setError(err.message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md px-4">
      <div className="flex items-center justify-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
          <Brain size={18} className="text-white" />
        </div>
        <span className="text-white font-bold text-xl tracking-tight">Recalro</span>
      </div>

      <div className="bg-[#111111] border border-white/8 rounded-2xl p-8">
        <div className="mb-7">
          <h1 className="text-xl font-bold text-white">Create your account</h1>
          <p className="text-sm text-gray-500 mt-1">Start mastering your certifications today — free forever</p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
            <AlertCircle size={15} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Full name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required
              className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/60 transition-all" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Email address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
              className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/60 transition-all" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-400">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/60 transition-all" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-1 items-center">
                  {[1,2,3].map((i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : "bg-white/10"}`} />
                  ))}
                  <span className="text-xs text-gray-500 ml-1 w-10">{strengthLabel}</span>
                </div>
                <div className="space-y-1">
                  {PASSWORD_RULES.map((rule) => (
                    <div key={rule.label} className="flex items-center gap-1.5">
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all ${rule.test(password) ? "bg-emerald-500/20" : "bg-white/5"}`}>
                        <Check size={9} className={rule.test(password) ? "text-emerald-400" : "text-gray-600"} />
                      </div>
                      <span className={`text-xs transition-colors ${rule.test(password) ? "text-gray-400" : "text-gray-600"}`}>{rule.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2 mt-2">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Creating account...</> : "Create free account"}
          </button>
        </form>

        <p className="text-xs text-gray-600 text-center mt-5">
          By signing up you agree to our{" "}
          <span className="text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">Terms</span>
          {" "}and{" "}
          <span className="text-gray-500 cursor-pointer hover:text-gray-300 transition-colors">Privacy Policy</span>
        </p>
      </div>

      <p className="text-center text-sm text-gray-600 mt-5">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Sign in</Link>
      </p>
    </div>
  );
}
