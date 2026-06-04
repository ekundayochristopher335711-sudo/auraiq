"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, Brain, Upload, Plus, Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { api, Subject, ExtractedContent } from "@/lib/api";
import { DropZone } from "@/components/upload/DropZone";
import { ExtractionPreview } from "@/components/upload/ExtractionPreview";
import { cn } from "@/lib/utils";

type UploadStep = "idle" | "uploading" | "preview" | "saving";

interface SubjectFlashcard {
  id: number;
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  created_at?: string;
}

function FlashcardRow({ card, onDelete }: { card: SubjectFlashcard; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const diffColor = card.difficulty === "easy" ? "text-emerald-400 bg-emerald-500/10" :
    card.difficulty === "hard" ? "text-red-400 bg-red-500/10" : "text-amber-400 bg-amber-500/10";

  const handleDelete = async () => {
    if (!confirm("Delete this flashcard?")) return;
    setDeleting(true);
    try { await onDelete(card.id); } finally { setDeleting(false); }
  };

  return (
    <div className="rounded-xl border border-white/8 bg-[#0d0d0d] overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5 capitalize", diffColor)}>
          {card.difficulty}
        </span>
        <p className="flex-1 text-sm text-gray-300 leading-snug">{card.question}</p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-6 h-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="w-6 h-6 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-gray-600 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-white/6 px-4 py-3 bg-violet-500/5">
          <p className="text-xs text-gray-500 mb-1">Answer</p>
          <p className="text-sm text-gray-200">{card.answer}</p>
        </div>
      )}
    </div>
  );
}

function SubjectDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openUpload = searchParams.get("upload") === "1";

  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(openUpload);
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [preview, setPreview] = useState<ExtractedContent | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [savingPreview, setSavingPreview] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [flashcards, setFlashcards] = useState<SubjectFlashcard[]>([]);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);

  useEffect(() => {
    api.subjects.list()
      .then((list) => {
        const found = list.find((s) => s.id === Number(id));
        setSubject(found ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const loadFlashcards = async () => {
    setFlashcardsLoading(true);
    try {
      const data = await api.subjects.getFlashcards(Number(id));
      setFlashcards(data as SubjectFlashcard[]);
    } catch { /* ignore */ } finally {
      setFlashcardsLoading(false);
    }
  };

  const toggleFlashcards = () => {
    if (!showFlashcards && flashcards.length === 0) loadFlashcards();
    setShowFlashcards((v) => !v);
  };

  const handleFlashcardDelete = async (cardId: number) => {
    await api.flashcards.delete(cardId);
    setFlashcards((prev) => prev.filter((c) => c.id !== cardId));
  };

  const handleFile = async (file: File) => {
    setUploadStep("uploading");
    setUploadError("");
    try {
      const { preview: extracted } = await api.upload.extract(file);
      setPreview(extracted);
      setUploadStep("preview");
    } catch (err: any) {
      setUploadError(err.message ?? "Extraction failed.");
      setUploadStep("idle");
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setSavingPreview(true);
    try {
      await api.upload.save(preview);
      setShowUpload(false);
      setPreview(null);
      setUploadStep("idle");
      const list = await api.subjects.list();
      const updated = list.find((s) => s.id === Number(id));
      if (updated) setSubject(updated);
      // refresh flashcards if visible
      if (showFlashcards) loadFlashcards();
    } catch (err: any) {
      setUploadError(err.message ?? "Save failed.");
    } finally {
      setSavingPreview(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!confirm(`Delete "${subject?.title}" and all its flashcards? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.subjects.delete(Number(id));
      router.push("/subjects");
    } catch (err: any) {
      alert(err.message ?? "Delete failed");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-violet-400" />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="p-6 text-center py-32">
        <p className="text-gray-500 mb-4">Subject not found.</p>
        <Link href="/subjects" className="text-violet-400 hover:text-violet-300 text-sm">← Back to subjects</Link>
      </div>
    );
  }

  const pct = Math.round(subject.mastery_score * 100);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl">
      {/* Back + header */}
      <div>
        <Link href="/subjects" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 w-fit">
          <ArrowLeft size={14} /> Back to Subjects
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{subject.title}</h1>
            {subject.description && <p className="text-sm text-gray-500 mt-1">{subject.description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-1.5 border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 text-gray-400 hover:text-violet-400 text-xs sm:text-sm rounded-xl px-3 py-2 transition-all"
            >
              <Upload size={13} /> <span className="hidden sm:inline">Upload More</span><span className="sm:hidden">Upload</span>
            </button>
            <button
              onClick={handleDeleteSubject}
              disabled={deleting}
              className="flex items-center gap-1.5 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10 text-red-500/60 hover:text-red-400 text-xs sm:text-sm rounded-xl px-3 py-2 transition-all disabled:opacity-40"
            >
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mastery bar */}
      <div className="rounded-2xl bg-[#141414] border border-white/8 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-300">Subject Mastery</p>
          <span className={cn("text-sm font-bold", pct >= 75 ? "text-emerald-400" : pct >= 45 ? "text-amber-400" : "text-red-400")}>
            {pct}%
          </span>
        </div>
        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-700", pct >= 75 ? "bg-emerald-500" : pct >= 45 ? "bg-amber-500" : "bg-red-500")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-3">
          <Link
            href="/flashcards"
            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            <Zap size={12} /> Start Review Session
          </Link>
          <p className="text-xs text-gray-600">Upload a document to add flashcards</p>
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="rounded-2xl bg-[#141414] border border-violet-500/20 p-4 sm:p-5 space-y-4">
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <Upload size={15} className="text-violet-400" /> Add Study Material
          </p>

          {uploadError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{uploadError}</p>
          )}

          {uploadStep === "idle" && (
            <DropZone onFile={handleFile} />
          )}

          {uploadStep === "uploading" && (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 size={28} className="animate-spin text-violet-400" />
              <p className="text-sm text-gray-400">Analyzing document with AI...</p>
            </div>
          )}

          {uploadStep === "preview" && preview && (
            <ExtractionPreview
              content={preview}
              onConfirm={handleSave}
              onDiscard={() => { setPreview(null); setUploadStep("idle"); }}
              saving={savingPreview}
            />
          )}
        </div>
      )}

      {/* Flashcards section */}
      <div className="rounded-2xl bg-[#141414] border border-white/8 overflow-hidden">
        <button
          onClick={toggleFlashcards}
          className="w-full flex items-center justify-between px-4 sm:px-5 py-4 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-violet-400" />
            <span className="text-sm font-semibold text-white">Flashcards</span>
            {flashcards.length > 0 && (
              <span className="text-xs text-gray-500 bg-white/5 rounded-full px-2 py-0.5">{flashcards.length}</span>
            )}
          </div>
          {showFlashcards ? <ChevronUp size={15} className="text-gray-500" /> : <ChevronDown size={15} className="text-gray-500" />}
        </button>

        {showFlashcards && (
          <div className="border-t border-white/6 p-4 sm:p-5">
            {flashcardsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-violet-400" />
              </div>
            ) : flashcards.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                  <Brain size={18} className="text-gray-500" />
                </div>
                <p className="text-sm text-gray-500 mb-3">No flashcards yet</p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="flex items-center gap-2 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-3 py-2 font-medium transition-colors"
                >
                  <Plus size={12} /> Upload a document
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 mb-3">Tap a card to see the answer · tap trash to delete</p>
                {flashcards.map((card) => (
                  <FlashcardRow key={card.id} card={card} onDelete={handleFlashcardDelete} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SubjectDetailPage() {
  return (
    <Suspense fallback={null}>
      <SubjectDetailContent />
    </Suspense>
  );
}
