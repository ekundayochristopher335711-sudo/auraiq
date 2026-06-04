"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Brain, Mail } from "lucide-react";

export default function VerifyOTPPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email  = params.get("email") ?? "";

  return (
    <div className="w-full max-w-md px-4">
      <div className="flex items-center justify-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
          <Brain size={18} className="text-white" />
        </div>
        <span className="text-white font-bold text-xl tracking-tight">AuraIQ</span>
      </div>

      <div className="bg-[#111111] border border-white/8 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
          <Mail size={24} className="text-violet-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
        <p className="text-sm text-gray-400 leading-relaxed mb-2">
          We sent a confirmation link to
        </p>
        <p className="text-sm font-medium text-white mb-6">
          {email || "your email address"}
        </p>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          Open the email and click the confirmation link to activate your account. Then come back and sign in.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition-colors"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}
