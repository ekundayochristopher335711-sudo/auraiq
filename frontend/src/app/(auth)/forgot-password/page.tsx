"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain, Loader2, ArrowLeft, Eye, EyeOff, Check } from "lucide-react";
import { api } from "@/lib/api";

function OTPInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handle = (i: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const arr = value.split("").concat(Array(6).fill("")).slice(0, 6);
    arr[i] = char;
    onChange(arr.join("").slice(0, 6));
    if (char && i < 5) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (value[i]) { const a = value.split(""); a[i] = ""; onChange(a.join("")); }
      else if (i > 0) refs.current[i - 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(digits);
    refs.current[Math.min(digits.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2.5 justify-center" onPaste={onPaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handle(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="w-11 text-center text-xl font-bold bg-[#1a1a1a] border border-white/8 rounded-xl text-white focus:border-violet-500/60 focus:outline-none transition-all"
          style={{ height: "52px" }}
        />
      ))}
    </div>
  );
}

type Step = "email" | "reset";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep]           = useState<Step>("email");
  const [email, setEmail]         = useState("");
  const [code, setCode]           = useState("");
  const [newPass, setNewPass]     = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await api.auth.forgotPassword(email);
      setStep("reset");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const resetPw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) { setError("Enter the 6-digit code"); return; }
    if (newPass.length < 8) { setError("Password must be at least 8 characters"); return; }
    setError(""); setLoading(true);
    try {
      await api.auth.resetPassword(email, code, newPass);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err.message ?? "Invalid or expired code");
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
        <span className="text-white font-bold text-xl tracking-tight">AuraIQ</span>
      </div>

      <div className="bg-[#111111] border border-white/8 rounded-2xl p-8">
        {success ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <Check size={24} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Password reset!</h2>
            <p className="text-sm text-gray-500">Redirecting to login...</p>
          </div>
        ) : step === "email" ? (
          <>
            <div className="mb-7">
              <h1 className="text-xl font-bold text-white">Forgot password?</h1>
              <p className="text-sm text-gray-500 mt-1">Enter your email and we'll send a reset code</p>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 text-sm text-red-400">{error}</div>}
            <form onSubmit={sendCode} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Email address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/60 transition-all"
                />
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : "Send Reset Code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-7">
              <button onClick={() => { setStep("email"); setCode(""); setError(""); }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-4 transition-colors">
                <ArrowLeft size={14} /> Back
              </button>
              <h1 className="text-xl font-bold text-white">Enter reset code</h1>
              <p className="text-sm text-gray-500 mt-1">
                Code sent to <span className="text-gray-300">{email}</span>
              </p>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 text-sm text-red-400">{error}</div>}
            <form onSubmit={resetPw} className="space-y-5">
              <OTPInput value={code} onChange={setCode} />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">New password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={newPass} onChange={(e) => setNewPass(e.target.value)}
                    placeholder="••••••••" required minLength={8}
                    className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/60 transition-all"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button
                type="submit" disabled={loading || code.length < 6}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 size={15} className="animate-spin" /> Resetting...</> : "Reset Password"}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="text-center text-sm text-gray-600 mt-5">
        Remember it?{" "}
        <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
