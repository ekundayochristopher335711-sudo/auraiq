"use client";
import { useState } from "react";
import Link from "next/link";
import { Brain, Loader2, Mail, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
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
        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
              <Mail size={24} className="text-violet-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              We sent a password reset link to <span className="text-white font-medium">{email}</span>.
              Click the link to set a new password.
            </p>
            <Link href="/login" className="mt-6 block text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <h1 className="text-xl font-bold text-white">Forgot password?</h1>
              <p className="text-sm text-gray-500 mt-1">Enter your email and we'll send a reset link</p>
            </div>
            {error && (
              <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
                <AlertCircle size={15} className="text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-400">Email address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/60 transition-all"
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : "Send Reset Link"}
              </button>
            </form>
          </>
        )}
      </div>

      {!sent && (
        <p className="text-center text-sm text-gray-600 mt-5">
          Remember it?{" "}
          <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Sign in</Link>
        </p>
      )}
    </div>
  );
}
