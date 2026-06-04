"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, Brain, ChevronDown, ChevronRight, Upload, Plus, Loader2 } from "lucide-react";
import { api, Subject, ExtractedContent } from "@/lib/api";
import { DropZone } from "@/components/upload/DropZone";
import { ExtractionPreview } from "@/components/upload/ExtractionPreview";
import { cn } from "@/lib/utils";

type UploadStep = "idle" | "uploading" | "preview" | "saving";

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

  useEffect(() => {
    api.subjects.list()
      .then((list) => {
        const found = list.find((s) => s.id === Number(id));
        setSubject(found ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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
    } catch (err: any) {
      setUploadError(err.message ?? "Save failed.");
    } finally {
      setSavingPreview(false);
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
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Back + header */}
      <div>
        <Link href="/subjects" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 w-fit">
          <ArrowLeft size={14} /> Back to Subjects
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{subject.title}</h1>
            {subject.description && <p className="text-sm text-gray-500 mt-1">{subject.description}</p>}
          </div>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 border border-white/10 hover:border-violet-500/40 hover:bg-violet-500/10 text-gray-400 hover:text-violet-400 text-sm rounded-xl px-4 py-2.5 transition-all shrink-0"
          >
            <Upload size={14} /> Upload More
          </button>
        </div>
      </div>

      {/* Mastery bar */}
      <div className="rounded-2xl bg-[#141414] border border-white/8 p-5">
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
        <div className="rounded-2xl bg-[#141414] border border-violet-500/20 p-5 space-y-4">
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

      {/* Empty state — no modules yet */}
      <div className="rounded-2xl bg-[#141414] border border-white/8 p-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <Brain size={22} className="text-gray-500" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">No content yet</h3>
        <p className="text-xs text-gray-500 max-w-xs mb-4">
          Upload a PDF, DOCX, or TXT file to let AuraIQ automatically extract modules, concepts, and flashcards.
        </p>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 py-2.5 font-medium transition-colors"
        >
          <Plus size={14} /> Upload Document
        </button>
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
