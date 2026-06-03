"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Zap, BookOpen, Brain, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExtractedContent, ExtractedModule } from "@/lib/api";

interface ExtractionPreviewProps {
  content: ExtractedContent;
  onConfirm: () => void;
  onDiscard: () => void;
  saving: boolean;
}

const diffColor: Record<string, string> = {
  easy: "text-emerald-400 bg-emerald-500/10",
  medium: "text-amber-400 bg-amber-500/10",
  hard: "text-red-400 bg-red-500/10",
};

function ModuleCard({ mod, index }: { mod: ExtractedModule; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="rounded-xl border border-white/8 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">
            {index + 1}
          </div>
          <span className="text-sm font-medium text-gray-200">{mod.title}</span>
          <span className="text-xs text-gray-600">
            {mod.concepts.length} concepts · {mod.flashcards.length} cards
          </span>
        </div>
        {open ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-3 space-y-4 bg-[#0f0f0f]">
          {/* Concepts */}
          {mod.concepts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Brain size={11} /> Key Concepts
              </p>
              <div className="space-y-2">
                {mod.concepts.map((c, i) => (
                  <div key={i} className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5">
                    <p className="text-sm font-medium text-gray-200">{c.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{c.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flashcards */}
          {mod.flashcards.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap size={11} /> Flashcards
              </p>
              <div className="space-y-2">
                {mod.flashcards.map((f, i) => (
                  <div key={i} className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-300 leading-snug">{f.question}</p>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded-md shrink-0 font-medium", diffColor[f.difficulty] ?? diffColor.medium)}>
                        {f.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 border-t border-white/5 pt-1.5">{f.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ExtractionPreview({ content, onConfirm, onDiscard, saving }: ExtractionPreviewProps) {
  const totalCards = content.modules.reduce((sum, m) => sum + m.flashcards.length, 0);
  const totalConcepts = content.modules.reduce((sum, m) => sum + m.concepts.length, 0);

  return (
    <div className="space-y-5">
      {/* Summary header */}
      <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-violet-400 font-medium uppercase tracking-wider mb-1">AI Extraction Complete</p>
            <h3 className="text-lg font-bold text-white">{content.subject_title}</h3>
            <p className="text-sm text-gray-400 mt-0.5">{content.subject_description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-violet-500/20">
          <div className="flex items-center gap-1.5 text-sm text-gray-300">
            <BookOpen size={14} className="text-violet-400" />
            <span>{content.modules.length} modules</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-300">
            <Brain size={14} className="text-violet-400" />
            <span>{totalConcepts} concepts</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-300">
            <Zap size={14} className="text-violet-400" />
            <span>{totalCards} flashcards</span>
          </div>
        </div>
      </div>

      {/* Module list */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {content.modules.map((mod, i) => (
          <ModuleCard key={i} mod={mod} index={i} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onConfirm}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          {saving ? (
            <><Loader2 size={15} className="animate-spin" /> Saving...</>
          ) : (
            <><Check size={15} /> Save Study System</>
          )}
        </button>
        <button
          onClick={onDiscard}
          disabled={saving}
          className="px-5 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20 text-sm font-medium transition-all disabled:opacity-50"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
