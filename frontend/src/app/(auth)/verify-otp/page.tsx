"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Brain } from "lucide-react";

export default function VerifyOTPPage() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  return (
    <div className="w-full max-w-md px-4">
      <div className="flex items-center justify-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
          <Brain size={18} className="text-white" />
        </div>
        <span className="text-white font-bold text-xl tracking-tight">AuraIQ</span>
      </div>

      <div className="bg-[#111111] border border-white/8 rounded-2xl p-8 text-center">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white mb-2">Confirm your email</h1>
          <p className="text-sm text-gray-400">
            We sent a confirmation link to <span className="text-white font-medium">{email || "your email address"}</span>.
          </p>
        </div>

        <p className="text-sm text-gray-500 leading-relaxed">
          Open the email and click the confirmation link. Then return to AuraIQ and sign in to continue.
        </p>

        <button
          onClick={() => router.push("/login")}
          className="mt-8 w-full rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition-colors"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}
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
      if (value[i]) {
        const arr = value.split("");
        arr[i] = "";
        onChange(arr.join(""));
      } else if (i > 0) {
        refs.current[i - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(digits);
    refs.current[Math.min(digits.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-3 justify-center" onPaste={onPaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handle(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          className="w-11 h-13 text-center text-xl font-bold bg-[#1a1a1a] border border-white/8 rounded-xl text-white focus:border-violet-500/60 focus:outline-none focus:bg-[#1f1f1f] transition-all"
          style={{ height: "52px" }}
        />
      ))}
    </div>
  );
}

function VerifyOTPContent() {
  const router      = useRouter();
  const params      = useSearchParams();
  const { saveToken: _save } = { saveToken: (t: string) => {
    localStorage.setItem("auraiq_token", t);
    document.cookie = `auraiq_token=${t}; path=/; max-age=${60*60*24*7}; SameSite=Lax`;
  }};
  const email   = params.get("email") ?? "";
  const purpose = params.get("purpose") ?? "verify_email";

  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [resent, setResent]   = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) { setError("Enter all 6 digits"); return; }
    setError(""); setLoading(true);
    try {
      const res = await api.auth.verifyOTP(email, code, purpose);
      if (res.access_token) {
        _save(res.access_token);
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message ?? "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    try {
      await api.auth.resendOTP(email, purpose);
      setResent(true);
      setCountdown(60);
    } catch {}
  };

  const isVerifyEmail = purpose === "verify_email";

  return (
    <div className="w-full max-w-md px-4">
      <div className="flex items-center justify-center gap-2.5 mb-8">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
          <Brain size={18} className="text-white" />
        </div>
        <span className="text-white font-bold text-xl tracking-tight">AuraIQ</span>
      </div>

      <div className="bg-[#111111] border border-white/8 rounded-2xl p-8">
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📧</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">
            {isVerifyEmail ? "Verify your email" : "Check your email"}
          </h1>
          <p className="text-sm text-gray-500">
            We sent a 6-digit code to <span className="text-gray-300 font-medium">{email}</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        {resent && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-5 text-sm text-emerald-400 text-center">
            New code sent!
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <OTPInput value={code} onChange={setCode} />

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={15} className="animate-spin" /> Verifying...</> : "Verify Code"}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 mt-5">
          <span className="text-sm text-gray-600">Didn&apos;t receive it?</span>
          <button
            onClick={handleResend}
            disabled={countdown > 0}
            className="flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw size={12} />
            {countdown > 0 ? `Resend in ${countdown}s` : "Resend code"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <VerifyOTPContent />
    </Suspense>
  );
}
