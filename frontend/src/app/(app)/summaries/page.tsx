"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText, Sparkles, BookOpen, ChevronDown, Loader2,
  Play, Pause, Square, Copy, Check, Download, Volume2, Save, RotateCw, MousePointerClick, Gauge, AudioLines,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Subject } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

const ALL = "__all__";
const SPEEDS = [0.75, 0.9, 1, 1.25, 1.5];   // read-aloud speeds, default slightly slow

// Pick up to 4 BALANCED English voices — one per accent/region, so the user
// gets real variety instead of four near-identical US voices. Nigerian English
// is prioritised where the device provides it (mainly Android/Chrome; iOS has
// no en-NG voice, so it simply won't appear there).
const REGION_ORDER = ["en-ng", "en-gb", "en-us", "en-au", "en-in", "en-ie", "en-za", "en-ca", "en-nz"];
const PREFERRED_NAMES = [
  "Google Nigerian English", "Google UK English Female", "Google UK English Male",
  "Daniel", "Samantha", "Google US English", "Microsoft Aria", "Microsoft Zira",
  "Karen", "Rishi", "Tessa", "Moira", "Microsoft Guy",
];

function voiceQuality(v: SpeechSynthesisVoice): number {
  let s = 0;
  const idx = PREFERRED_NAMES.indexOf(v.name);
  if (idx !== -1) s += 100 - idx;
  if (v.default) s += 5;
  if (v.localService) s += 3;
  return s;
}

function pickVoices(all: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const en = all.filter((v) => v.lang?.toLowerCase().startsWith("en"));
  if (en.length === 0) return [];

  // Best voice per region
  const bestByRegion = new Map<string, SpeechSynthesisVoice>();
  for (const v of en) {
    const lang = v.lang?.toLowerCase() ?? "en";
    const cur = bestByRegion.get(lang);
    if (!cur || voiceQuality(v) > voiceQuality(cur)) bestByRegion.set(lang, v);
  }

  const result: SpeechSynthesisVoice[] = [];
  const usedLangs = new Set<string>();
  // Preferred regions first (Nigerian, UK, US, …) for a balanced spread
  for (const r of REGION_ORDER) {
    const v = bestByRegion.get(r);
    if (v) { result.push(v); usedLangs.add(r); }
    if (result.length >= 4) return result;
  }
  // Any remaining regions the device offers
  for (const [lang, v] of bestByRegion) {
    if (result.length >= 4) break;
    if (!usedLangs.has(lang)) { result.push(v); usedLangs.add(lang); }
  }
  // Still short (few regions)? fill with next-best distinct voices
  if (result.length < 4) {
    const chosen = new Set(result.map((v) => v.name));
    for (const v of [...en].sort((a, b) => voiceQuality(b) - voiceQuality(a))) {
      if (result.length >= 4) break;
      if (!chosen.has(v.name)) { result.push(v); chosen.add(v.name); }
    }
  }
  return result.slice(0, 4);
}

// Shorten a voice name for the dropdown label + show its accent
const REGION_LABEL: Record<string, string> = {
  "en-ng": "Nigeria", "en-gb": "UK", "en-us": "US", "en-au": "AU",
  "en-in": "India", "en-ie": "Ireland", "en-za": "SA", "en-ca": "CA", "en-nz": "NZ",
};
function voiceLabel(v: SpeechSynthesisVoice): string {
  const name = v.name.split(" - ")[0].replace(/^(Microsoft|Google)\s+/, "").replace(/\s+English$/i, "").trim();
  const region = REGION_LABEL[v.lang?.toLowerCase() ?? ""] ?? "";
  return region ? `${name} (${region})` : name;
}

// ── Markdown helpers ──────────────────────────────────────────────────────────
function stripInline(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .split(/\n/).map((l) => stripInline(l)).join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// Render inline **bold** inside a sentence
function renderInline(raw: string) {
  const parts = raw.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      return <strong key={i} className="text-violet-300 font-semibold">{p.slice(2, -2)}</strong>;
    }
    return <span key={i}>{p.replace(/`([^`]+)`/g, "$1")}</span>;
  });
}

type Seg = { id: number; raw: string };
type Blk = { key: number; type: "h1" | "h2" | "h3" | "li" | "p"; segs: Seg[] };

// Parse the summary into styled blocks + a flat list of spoken sentences.
// Every sentence gets a stable id shared between the rendered span and the speech queue.
function parseSummary(md: string): { blocks: Blk[]; sentences: string[] } {
  const blocks: Blk[] = [];
  const sentences: string[] = [];
  let id = 0, key = 0;

  for (const line of md.split(/\n/)) {
    const t = line.trim();
    if (!t) continue;

    let type: Blk["type"] = "p";
    let content = t;
    if (/^###\s+/.test(t)) { type = "h3"; content = t.replace(/^###\s+/, ""); }
    else if (/^##\s+/.test(t)) { type = "h2"; content = t.replace(/^##\s+/, ""); }
    else if (/^#\s+/.test(t)) { type = "h1"; content = t.replace(/^#\s+/, ""); }
    else if (/^[-*]\s+/.test(t)) { type = "li"; content = t.replace(/^[-*]\s+/, ""); }
    else if (/^\d+\.\s+/.test(t)) { type = "li"; content = t.replace(/^\d+\.\s+/, ""); }

    const parts = content.match(/[^.!?]+[.!?]*/g) ?? [content];
    const segs: Seg[] = [];
    for (const part of parts) {
      const raw = part.trim();
      const plain = stripInline(raw);
      if (!plain) continue;
      segs.push({ id, raw });
      sentences.push(plain);
      id++;
    }
    if (segs.length) blocks.push({ key: key++, type, segs });
  }
  return { blocks, sentences };
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
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const [speechState, setSpeechState] = useState<"idle" | "playing" | "paused">("idle");
  const [activeId, setActiveId] = useState<number | null>(null);
  const [rate, setRate] = useState(0.9);   // default read-aloud speed (slightly slow)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string>("");
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const sentencesRef = useRef<string[]>([]);
  const idxRef = useRef(0);
  const genRef = useRef(0);   // generation token — invalidates callbacks from a cancelled run
  const rateRef = useRef(0.9);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const supportsSpeech = typeof window !== "undefined" && "speechSynthesis" in window;

  // ── HD voices (Google TTS) — real audio, background playback ──────────────
  const [hdConfigured, setHdConfigured] = useState(false);
  const [hdVoices, setHdVoices] = useState<{ name: string; label: string; lang: string }[]>([]);
  const [hdVoiceName, setHdVoiceName] = useState("");
  const [hdState, setHdState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hdChunksRef = useRef<string[]>([]);
  const hdIdxRef = useRef(0);
  const hdGenRef = useRef(0);
  const hdCacheRef = useRef<Record<string, string[]>>({});   // {text|voice → audio chunks}
  // Which engine is active: HD when configured AND an HD voice is chosen
  const usingHD = hdConfigured && !!hdVoiceName;

  const currentSubjectId = selected === ALL ? null : Number(selected);
  const parsed = useMemo(() => parseSummary(summary), [summary]);

  // Keep the speech queue in sync with what's on screen
  useEffect(() => { sentencesRef.current = parsed.sentences; }, [parsed]);
  // Keep the latest rate available to in-flight speech callbacks
  useEffect(() => { rateRef.current = rate; }, [rate]);

  // Load the device's speech voices (they arrive asynchronously) and curate a short English list
  useEffect(() => {
    if (!supportsSpeech) return;
    const load = () => {
      const picked = pickVoices(window.speechSynthesis.getVoices());
      if (picked.length === 0) return;
      setVoices(picked);
      setVoiceURI((cur) => {
        if (cur && picked.some((v) => v.voiceURI === cur)) return cur;
        const def = picked[0];
        voiceRef.current = def;
        return def.voiceURI;
      });
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.subjects.list().then(setSubjects).catch(() => {});
    // Detect HD voices; default to the first HD voice when available
    api.ai.ttsConfig().then((cfg) => {
      if (cfg.configured && cfg.voices.length > 0) {
        setHdConfigured(true);
        setHdVoices(cfg.voices);
        setHdVoiceName(cfg.voices[0].name);
      }
    }).catch(() => {});
    return () => {
      if (supportsSpeech) window.speechSynthesis.cancel();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTitle =
    selected === ALL ? "All Subjects" : subjects.find((s) => String(s.id) === selected)?.title ?? "Select";

  const stopSpeech = () => {
    genRef.current += 1;
    if (supportsSpeech) window.speechSynthesis.cancel();
    setSpeechState("idle");
    setActiveId(null);
    idxRef.current = 0;
  };

  // Core engine: speak sentence-by-sentence starting at `from`, chaining reliably.
  const startSpeaking = (from: number) => {
    if (!supportsSpeech || sentencesRef.current.length === 0) return;
    window.speechSynthesis.cancel();
    genRef.current += 1;
    const gen = genRef.current;
    idxRef.current = from;
    setSpeechState("playing");

    const speak = () => {
      if (gen !== genRef.current) return;            // a newer run superseded this one
      const arr = sentencesRef.current;
      const i = idxRef.current;
      if (i >= arr.length) { setSpeechState("idle"); setActiveId(null); idxRef.current = 0; return; }
      setActiveId(i);
      const utter = new SpeechSynthesisUtterance(arr[i]);
      utter.rate = rateRef.current;
      utter.pitch = 1;
      if (voiceRef.current) { utter.voice = voiceRef.current; utter.lang = voiceRef.current.lang; }
      utter.onend = () => {
        if (gen !== genRef.current) return;          // ignore end-events from cancelled speech
        idxRef.current += 1;
        speak();                                     // advance unconditionally — this is the fix
      };
      utter.onerror = () => {
        if (gen !== genRef.current) return;
        idxRef.current += 1;
        speak();
      };
      window.speechSynthesis.speak(utter);
    };
    speak();
  };

  const handlePlay = () => {
    if (!supportsSpeech || !summary) return;
    if (speechState === "paused") {
      window.speechSynthesis.resume();
      setSpeechState("playing");
      return;
    }
    startSpeaking(0);
  };

  const handlePause = () => {
    if (!supportsSpeech) return;
    window.speechSynthesis.pause();
    setSpeechState("paused");
  };

  // Cycle to the next speed. HD audio changes speed live; browser speech restarts the sentence.
  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(rate) + 1) % SPEEDS.length] ?? 1;
    rateRef.current = next;
    setRate(next);
    if (usingHD) {
      if (audioRef.current) audioRef.current.playbackRate = next;
    } else if (speechState === "playing") {
      startSpeaking(idxRef.current);
    }
  };

  const changeVoice = (v: SpeechSynthesisVoice) => {
    stopHD();
    voiceRef.current = v;
    setVoiceURI(v.voiceURI);
    setHdVoiceName("");          // switch to the device-voice engine
    setShowVoiceMenu(false);
    if (speechState === "playing") startSpeaking(idxRef.current);
  };

  const changeHDVoice = (name: string) => {
    stopSpeech();
    stopHD();
    setHdVoiceName(name);        // switch to the HD engine
    setShowVoiceMenu(false);
  };

  const currentVoice = voices.find((v) => v.voiceURI === voiceURI);

  // ── HD engine ─────────────────────────────────────────────────────────────
  const setupMediaSession = () => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: summaryLabel || "Note Summary", artist: "Recalro", album: "Summaries",
      });
      navigator.mediaSession.setActionHandler("play", () => playHD());
      navigator.mediaSession.setActionHandler("pause", () => pauseHD());
      navigator.mediaSession.setActionHandler("stop", () => stopHD());
    } catch { /* not supported */ }
  };

  const playHDChunk = (gen: number) => {
    if (gen !== hdGenRef.current) return;
    const chunks = hdChunksRef.current;
    const i = hdIdxRef.current;
    if (i >= chunks.length) { setHdState("idle"); hdIdxRef.current = 0; return; }
    const audio = audioRef.current ?? (audioRef.current = new Audio());
    audio.src = `data:audio/mp3;base64,${chunks[i]}`;
    audio.playbackRate = rateRef.current;
    audio.onended = () => {
      if (gen !== hdGenRef.current) return;
      hdIdxRef.current += 1;
      playHDChunk(gen);
    };
    audio.play().catch(() => {});
  };

  const playHD = async () => {
    if (!summary) return;
    if (hdState === "paused" && audioRef.current) {
      audioRef.current.play().catch(() => {});
      setHdState("playing");
      return;
    }
    const key = `${hdVoiceName}|${summary}`;
    hdGenRef.current += 1;
    const gen = hdGenRef.current;

    // Cached this session? play instantly (no re-charge)
    if (hdCacheRef.current[key]) {
      hdChunksRef.current = hdCacheRef.current[key];
      hdIdxRef.current = 0;
      setHdState("playing");
      setupMediaSession();
      playHDChunk(gen);
      return;
    }

    setHdState("loading");
    try {
      const { audios } = await api.ai.tts(toPlainText(summary), hdVoiceName, rate);
      if (gen !== hdGenRef.current) return;
      if (!audios || audios.length === 0) throw new Error("No audio returned");
      hdCacheRef.current[key] = audios;
      hdChunksRef.current = audios;
      hdIdxRef.current = 0;
      setHdState("playing");
      setupMediaSession();
      playHDChunk(gen);
    } catch (err: any) {
      setHdState("idle");
      toast.error(err?.message ?? "HD voice failed — try a device voice.");
    }
  };

  const pauseHD = () => {
    audioRef.current?.pause();
    setHdState("paused");
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
  };

  const stopHD = () => {
    hdGenRef.current += 1;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setHdState("idle");
    hdIdxRef.current = 0;
  };

  // ── Unified controls (route to whichever engine is active) ────────────────
  const playState = usingHD ? (hdState === "loading" ? "playing" : hdState) : speechState;
  const isLoadingAudio = usingHD && hdState === "loading";

  const onPlay  = () => (usingHD ? playHD() : handlePlay());
  const onPause = () => (usingHD ? pauseHD() : handlePause());
  const onStop  = () => (usingHD ? stopHD() : stopSpeech());

  // When the selected scope changes, load any previously saved summary for it
  useEffect(() => {
    stopSpeech();
    stopHD();
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
    stopHD();
    setLoading(true);
    setError("");
    setSummary("");
    setSaved(false);
    try {
      // Prefer the subject's full stored document text (richest source);
      // fall back to its flashcards (or all flashcards for "All Subjects").
      let content = "";
      if (selected !== ALL) {
        const doc = await api.subjects.getContent(Number(selected)).catch(() => "");
        if (doc && doc.trim().length > 200) content = doc;
      }

      if (!content) {
        let cards: { question: string; answer: string }[];
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
        content = cards.map((c) => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n");
      }
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

  // Clickable sentence — starts reading from this point
  // Click-to-read + karaoke highlight only apply to the device-voice engine.
  const Sentence = ({ seg }: { seg: Seg }) =>
    usingHD ? (
      <span>{renderInline(seg.raw)}{" "}</span>
    ) : (
      <span
        onClick={() => startSpeaking(seg.id)}
        title="Click to listen from here"
        className={cn(
          "cursor-pointer rounded px-0.5 -mx-0.5 transition-colors",
          activeId === seg.id
            ? "bg-violet-500/30 text-white"
            : "hover:bg-violet-500/10"
        )}
      >
        {renderInline(seg.raw)}{" "}
      </span>
    );

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
        <div className="rounded-2xl bg-[#141414] border border-white/8">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-white/8 bg-[#111] rounded-t-2xl">
            <p className="text-sm font-semibold text-white flex items-center gap-2 min-w-0">
              <FileText size={15} className="text-violet-400 shrink-0" />
              <span className="truncate">{summaryLabel}</span>
              {saved ? (
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5 shrink-0">Saved</span>
              ) : (
                <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5 shrink-0">Unsaved</span>
              )}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
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
              {(supportsSpeech || hdConfigured) && (
                <>
                  {/* Voice selector — HD (Google) voices + device voices */}
                  {(voices.length > 0 || hdVoices.length > 0) && (
                    <div className="relative">
                      <button
                        onClick={() => setShowVoiceMenu((v) => !v)}
                        title="Voice"
                        className="flex items-center gap-1 text-xs font-medium text-gray-300 border border-white/10 hover:bg-white/5 rounded-lg px-2.5 py-2 transition-colors max-w-[150px]"
                      >
                        <AudioLines size={13} className="text-violet-400 shrink-0" />
                        <span className="truncate">
                          {usingHD
                            ? `${hdVoices.find((v) => v.name === hdVoiceName)?.label ?? "HD"} · HD`
                            : currentVoice ? voiceLabel(currentVoice) : "Voice"}
                        </span>
                        <ChevronDown size={11} className={cn("text-gray-500 transition-transform shrink-0", showVoiceMenu && "rotate-180")} />
                      </button>
                      {showVoiceMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowVoiceMenu(false)} />
                          <div className="absolute left-0 top-full mt-1.5 w-52 max-w-[calc(100vw-3rem)] max-h-72 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 py-1">
                            {hdVoices.length > 0 && (
                              <>
                                <p className="px-3.5 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-violet-400/80">HD · plays in background</p>
                                {hdVoices.map((v) => (
                                  <button key={v.name} onClick={() => changeHDVoice(v.name)}
                                    className={cn("w-full text-left px-3.5 py-2 text-xs transition-colors truncate",
                                      usingHD && v.name === hdVoiceName ? "text-violet-400 bg-violet-500/10" : "text-gray-300 hover:bg-white/5")}>
                                    {v.label}
                                  </button>
                                ))}
                              </>
                            )}
                            {voices.length > 0 && (
                              <>
                                <p className="px-3.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Device voices</p>
                                {voices.map((v) => (
                                  <button key={v.voiceURI} onClick={() => changeVoice(v)}
                                    className={cn("w-full text-left px-3.5 py-2 text-xs transition-colors truncate",
                                      !usingHD && v.voiceURI === voiceURI ? "text-violet-400 bg-violet-500/10" : "text-gray-300 hover:bg-white/5")}>
                                    {voiceLabel(v)}
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  <button
                    onClick={cycleSpeed}
                    title="Reading speed"
                    className="flex items-center gap-1 text-xs font-medium text-gray-300 border border-white/10 hover:bg-white/5 rounded-lg px-2.5 py-2 transition-colors"
                  >
                    <Gauge size={13} className="text-violet-400" />
                    {rate}×
                  </button>
                  {playState !== "playing" ? (
                    <button
                      onClick={onPlay}
                      className="flex items-center gap-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg px-3 py-2 transition-colors"
                    >
                      {playState === "paused" ? <Play size={13} /> : <Volume2 size={13} />}
                      {playState === "paused" ? "Resume" : "Listen"}
                    </button>
                  ) : (
                    <button
                      onClick={isLoadingAudio ? undefined : onPause}
                      className="flex items-center gap-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-3 py-2 transition-colors"
                    >
                      {isLoadingAudio ? <><Loader2 size={13} className="animate-spin" /> Loading</> : <><Pause size={13} /> Pause</>}
                    </button>
                  )}
                  {playState !== "idle" && (
                    <button
                      onClick={onStop}
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

          {/* Click-to-read hint */}
          {supportsSpeech && (
            <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 text-[11px] text-gray-500">
              <MousePointerClick size={12} className="text-violet-400/70" />
              Tip: click any sentence to start listening from there.
            </div>
          )}

          {/* Body — clickable, highlightable sentences */}
          <div className="px-4 sm:px-6 py-4 text-sm leading-7 text-gray-200">
            {parsed.blocks.map((b) => {
              const inner = b.segs.map((seg) => <Sentence key={seg.id} seg={seg} />);
              if (b.type === "h1") return <h1 key={b.key} className="text-lg font-bold text-white mb-2 mt-4 first:mt-0">{inner}</h1>;
              if (b.type === "h2") return <h2 key={b.key} className="text-base font-bold text-white mb-2 mt-4 first:mt-0">{inner}</h2>;
              if (b.type === "h3") return <h3 key={b.key} className="text-sm font-semibold text-gray-100 mb-1.5 mt-3">{inner}</h3>;
              if (b.type === "li") return (
                <div key={b.key} className="flex gap-2 mb-1.5 pl-1">
                  <span className="text-violet-400 shrink-0 mt-0.5">•</span>
                  <p className="flex-1">{inner}</p>
                </div>
              );
              return <p key={b.key} className="mb-3 last:mb-0">{inner}</p>;
            })}
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
