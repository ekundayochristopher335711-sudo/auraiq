"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, BookOpen, Zap, X, ArrowRight, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Brain,
    color: "bg-violet-500/10 text-violet-400",
    title: "Welcome to Recalro 🎉",
    desc: "Your AI-powered cognitive mastery engine. Upload study materials and let AI transform them into a personalized learning system.",
    action: "Get Started",
  },
  {
    icon: Upload,
    color: "bg-blue-500/10 text-blue-400",
    title: "Upload your study material",
    desc: "Go to Subjects → Create a subject → Upload a PDF or DOCX. Recalro will extract modules, concepts, and flashcards automatically.",
    action: "Go to Subjects",
  },
  {
    icon: Zap,
    color: "bg-emerald-500/10 text-emerald-400",
    title: "Start reviewing flashcards",
    desc: "Once uploaded, review your AI-generated flashcards using our spaced repetition algorithm. The more you review, the smarter it gets.",
    action: "Done — let me explore",
  },
];

interface Props {
  onDismiss: () => void;
}

export function OnboardingModal({ onDismiss }: Props) {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  const handleAction = () => {
    if (step === 1) {
      onDismiss();
      router.push("/subjects");
    } else if (isLast) {
      onDismiss();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onDismiss} />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-[#141414] border border-white/8 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-300 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Step indicators */}
        <div className="flex gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 rounded-full transition-all duration-300",
                i === step ? "bg-violet-500 flex-1" : i < step ? "bg-violet-500/40 w-6" : "bg-white/10 w-6"
              )}
            />
          ))}
        </div>

        {/* Icon */}
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", current.color)}>
          <Icon size={22} />
        </div>

        {/* Content */}
        <h2 className="text-lg font-bold text-white mb-2">{current.title}</h2>
        <p className="text-sm text-gray-400 leading-relaxed mb-6">{current.desc}</p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleAction}
            className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
          >
            {current.action}
            {!isLast && <ArrowRight size={14} />}
          </button>
        </div>

        {step === 0 && (
          <button onClick={onDismiss} className="w-full text-center text-xs text-gray-600 hover:text-gray-400 mt-3 transition-colors">
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}
