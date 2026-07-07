"use client";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  FileText, Sparkles, BookOpen, ChevronDown, Loader2,
  Play, Pause, Square, Copy, Check, Download, Volume2, Save, RotateCw,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Subject } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

const ALL = "__all__";

// Strip markdown so the text reads cleanly when spoken aloud
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{2,}/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

// Split into speakable chunks — browsers choke on very long single utterances
function chunkText(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > 200) {
      if (current) chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export default function SummariesPage() {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<string>(ALL);
  const [showMenu, setShowMenu] = useState(false);
  const [summary, setSummary] = useState("");
  const [summaryLabel, setSummaryLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);      // is the shown summary persisted & unchanged?
  const [saving, setSaving] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const [speechState, setSpeechState] = useState<"idle" | "playing" | "paused">("idle");
  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);
  const supportsSpeech = typeof window !== "undefined" && "speechSynthesis" in window;

  const currentSubjectId = selected === ALL ? null : Number(selected);

  useEffect(() => {
    api.subjects.list().then(setSubjects).catch(() => {});
    return () => { if (supportsSpeech) window.speechSynthesis.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTitle =
    selected === ALL ? "All Subjects" : subjects.find((s) => String(s.id) === selected)?.title ?? "Select";

  const stopSpeech = () => {
    if (supportsSpeech) window.speechSynthesis.cancel();
    setSpeechState("idle");
    chunkIndexRef.current = 0;
  };

  // When the selected scope changes, load any previously saved summary for it
  useEffect(() => {
    stopSpeech();
    setError("");
    setSummary("");
    setSaved(false);
    setLoadingSaved(true);
    api.summaries.get(currentSubjectId)
      .then((row) => {
        if (row) {
          setSummary(row.content);
          setSummaryLabel(row.scope_label);
          setSaved(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSaved(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const saveSummary = async () => {
    if (!summary) return;
    setSaving(true);
    try {
      await api.summaries.save(currentSubjectId, summaryLabel || selectedTitle, summary);
      setSaved(true);
      toast.success("Summary saved.");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save summary.");
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    stopSpeech();
    setLoading(true);
    setError("");
    setSummary("");
    setSaved(false);
    try {
      // Gather this student's notes (flashcard Q&A) for the chosen scope
      let cards: { question: string; answer: string; subjects?: { title?: string } | null }[];
      if (selected === ALL) {
        cards = (await api.flashcards.all()) as any;
      } else {
        cards = (await api.subjects.getFlashcards(Number(selected))) as any;
      }

      if (!cards || cards.length === 0) {
        setError("No notes found for this selection. Upload study material to a subject first.");
        setLoading(false);
        return;
      }

      const content = cards
        .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
        .join("\n\n");

      const scope = selected === ALL ? "" : selectedTitle;
      const { summary: text } = await api.ai.summarize(scope, content);
      setSummary(text);
      setSummaryLabel(selectedTitle);
    } catch (err: any) {
      setError(err?.message ?? "Could not generate summary.");
    } finally {
      setLoading(false);
    }
  };

  const speakFromIndex = () => {
    if (!supportsSpeech) return;
    const chunks = chunksRef.current;
    const i = chunkIndexRef.current;
    if (i >= chunks.length) { setSpeechState("idle"); chunkIndexRef.current = 0; return; }
    const utter = new SpeechSynthesisUtterance(chunks[i]);
    utter.rate = 1;
    utter.pitch = 1;
    utter.onend = () => {
      chunkIndexRef.current += 1;
      if (chunkIndexRef.current < chunks.length && window.speechSynthesis.speaking !== false) {
        speakFromIndex();
      } else if (chunkIndexRef.current >= chunks.length) {
        setSpeechState("idle");
        chunkIndexRef.current = 0;
      }
    };
    window.speechSynthesis.speak(utter);
  };

  const handlePlay = () => {
    if (!supportsSpeech || !summary) return;
    if (speechState === "paused") {
      window.speechSynthesis.resume();
      setSpeechState("playing");
      return;
    }
    window.speechSynthesis.cancel();
    chunksRef.current = chunkText(toPlainText(summary));
    chunkIndexRef.current = 0;
    setSpeechState("playing");
    speakFromIndex();
  };

  const handlePause = () => {
    if (!supportsSpeech) return;
    window.speechSynthesis.pause();
    setSpeechState("paused");
  };

  const copySummary = async () => {
    await navigator.clipboard.writeText(toPlainText(summary));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadSummary = () => {
    const blob = new Blob([summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${summaryLabel || "summary"}-notes.txt`.replace(/\s+/g, "-").toLowerCase();
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center shrink-0">
          <FileText size={18} className="text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Note Summaries</h1>
          <p className="text-sm text-gray-500">Turn your uploaded notes into a summary you can read or listen to.</p>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-2xl bg-[#141414] border border-white/8 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Subject selector */}
          <div className="relative flex-1">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="w-full flex items-center justify-between gap-2 bg-[#0d0d0d] border border-white/10 hover:border-white/20 rounded-xl px-3.5 py-3 text-sm text-gray-200 transition-colors"
            >
              <span className="flex items-center gap-2 min-w-0">
                <BookOpen size={15} className="text-violet-400 shrink-0" />
                <span className="truncate">{selectedTitle}</span>
              </span>
              <ChevronDown size={14} className={cn("text-gray-500 transition-transform shrink-0", showMenu && "rotate-180")} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute left-0 right-0 top-full mt-1.5 max-h-64 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 py-1">
                  <button
                    onClick={() => { setSelected(ALL); setShowMenu(false); }}
                    className={cn("w-full text-left px-4 py-2.5 text-sm transition-colors",
                      selected === ALL ? "text-violet-400 bg-violet-500/10" : "text-gray-300 hover:bg-white/5")}
                  >
                    All Subjects
                  </button>
                  {subjects.length === 0 ? (
                    <p className="text-xs text-gray-500 px-4 py-2.5">No subjects yet — upload notes first</p>
                  ) : subjects.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setSelected(String(s.id)); setShowMenu(false); }}
                      className={cn("w-full text-left px-4 py-2.5 text-sm transition-colors truncate",
                        String(s.id) === selected ? "text-violet-400 bg-violet-500/10" : "text-gray-300 hover:bg-white/5")}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Generate */}
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl px-5 py-3 transition-colors shrink-0"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Summarizing…</>
              : summary
              ? <><RotateCw size={15} /> Regenerate</>
              : <><Sparkles size={15} /> Generate Summary</>}
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
        )}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="rounded-2xl bg-[#141414] border border-white/8 p-5 space-y-3">
          {[80, 95, 70, 88, 60].map((w, i) => (
            <div key={i} className="h-3.5 rounded-full bg-white/5 animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {/* Summary output */}
      {summary && !loading && (
        <div className="rounded-2xl bg-[#141414] border border-white/8 overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-white/8 bg-[#111]">
            <p className="text-sm font-semibold text-white flex items-center gap-2 min-w-0">
              <FileText size={15} className="text-violet-400 shrink-0" />
              <span className="truncate">{summaryLabel}</span>
              {saved ? (
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5 shrink-0">Saved</span>
              ) : (
                <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5 shrink-0">Unsaved</span>
              )}
            </p>
            <div className="flex items-center gap-1.5">
              {!saved && (
                <button
                  onClick={saveSummary}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg px-3 py-2 transition-colors"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save
                </button>
              )}
              {supportsSpeech && (
                <>
                  {speechState !== "playing" ? (
                    <button
                      onClick={handlePlay}
                      className="flex items-center gap-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg px-3 py-2 transition-colors"
                    >
                      {speechState === "paused" ? <Play size={13} /> : <Volume2 size={13} />}
                      {speechState === "paused" ? "Resume" : "Listen"}
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      className="flex items-center gap-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-3 py-2 transition-colors"
                    >
                      <Pause size={13} /> Pause
                    </button>
                  )}
                  {speechState !== "idle" && (
                    <button
                      onClick={stopSpeech}
                      title="Stop"
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Square size={12} />
                    </button>
                  )}
                </>
              )}
              <button
                onClick={copySummary}
                title="Copy"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
              <button
                onClick={downloadSummary}
                title="Download"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Download size={13} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-4 sm:px-6 py-5 text-sm leading-relaxed text-gray-200">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-3 space-y-1.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-3 space-y-1.5">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                strong: ({ children }) => <strong className="text-violet-300 font-semibold">{children}</strong>,
                em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
                h1: ({ children }) => <h1 className="text-lg font-bold text-white mb-2 mt-4 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold text-white mb-2 mt-4 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-100 mb-1.5 mt-3">{children}</h3>,
                code: ({ children }) => <code className="bg-black/40 text-violet-200 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-violet-500/50 pl-3 text-gray-400 italic mb-3">{children}</blockquote>,
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!summary && !loading && !loadingSaved && !error && (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <FileText size={22} className="text-gray-500" />
          </div>
          <p className="text-sm text-gray-400 mb-1">No summary yet</p>
          <p className="text-xs text-gray-600 max-w-xs mx-auto">
            Pick a subject (or all of them) and tap <span className="text-violet-400 font-medium">Generate Summary</span> to
            turn your uploaded notes into a revision recap you can read or listen to.
          </p>
        </div>
      )}
    </div>
  );
}
