"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Brain, Mail } from "lucide-react";

function VerifyOTPContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email  = params.get("email") ?? "";

  return (
    <div className="w-full max-w-md px-4">
      <div className="flex items-center justify-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
          <Brain size={18} className="text-white" />
        </div>
        <span className="text-white font-bold text-xl tracking-tight">Recalro</span>
      </div>

      <div className="bg-[#111111] border border-white/8 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
          <Mail size={24} className="text-violet-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
        <p className="text-sm text-gray-400 leading-relaxed mb-2">We sent a confirmation link to</p>
        <p className="text-sm font-medium text-white mb-6">{email || "your email address"}</p>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          Click the link in the email to activate your account, then come back and sign in.
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

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="flex gap-1.5">{[0,1,2].map(i=><div key={i} className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div></div>}>
      <VerifyOTPContent />
    </Suspense>
  );
}
