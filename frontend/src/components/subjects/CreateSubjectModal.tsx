"use client";
import { useState, useEffect, useRef } from "react";
import { X, BookOpen, Loader2 } from "lucide-react";
import { api, ExtractedContent } from "@/lib/api";
import { DropZone } from "@/components/upload/DropZone";
import { ExtractionPreview } from "@/components/upload/ExtractionPreview";

type Step = "form" | "uploading" | "preview" | "saving";

interface CreateSubjectModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateSubjectModal({ onClose, onCreated }: CreateSubjectModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploadMode, setUploadMode] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<ExtractedContent | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setStep("saving");
    try {
      await api.subjects.create(title.trim(), description.trim() || undefined);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to create subject.");
      setStep("form");
    }
  };

  const handleFile = async (file: File) => {
    setStep("uploading");
    setError("");
    try {
      const { preview: extracted, text } = await api.upload.extract(file);
      setPreview(extracted);
      setExtractedText(text ?? "");
      setStep("preview");
    } catch (err: any) {
      setError(err.message ?? "Extraction failed. Try again.");
      setStep("form");
    }
  };

  const handleSavePreview = async () => {
    if (!preview) return;
    setStep("saving");
    try {
      await api.upload.save(preview, undefined, extractedText);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Failed to save.");
      setStep("preview");
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-xl bg-[#111111] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <BookOpen size={14} className="text-violet-400" />
            </div>
            <h2 className="text-base font-semibold text-white">
              {step === "preview" ? "Review AI Extraction" : "New Subject"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Step: Preview */}
          {step === "preview" && preview && (
            <ExtractionPreview
              content={preview}
              onConfirm={handleSavePreview}
              onDiscard={() => { setPreview(null); setStep("form"); }}
              saving={false}
            />
          )}

          {/* Step: Uploading */}
          {step === "uploading" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative w-14 h-14">
                <div className="w-14 h-14 rounded-2xl bg-violet-600/20 flex items-center justify-center">
                  <BookOpen size={24} className="text-violet-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#111111] rounded-full flex items-center justify-center">
                  <Loader2 size={12} className="text-violet-400 animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Analyzing your document...</p>
                <p className="text-xs text-gray-500 mt-1">Recalro is extracting concepts & building flashcards</p>
              </div>
            </div>
          )}

          {/* Step: Form */}
          {(step === "form" || step === "saving") && (
            <div className="space-y-5">
              {/* Mode toggle */}
              <div className="flex rounded-xl bg-white/5 p-1 gap-1">
                <button
                  onClick={() => setUploadMode(false)}
                  className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all ${!uploadMode ? "bg-violet-600 text-white" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Manual
                </button>
                <button
                  onClick={() => setUploadMode(true)}
                  className={`flex-1 text-sm py-2 rounded-lg font-medium transition-all ${uploadMode ? "bg-violet-600 text-white" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Upload Document
                </button>
              </div>

              {uploadMode ? (
                <DropZone onFile={handleFile} disabled={step === "saving"} />
              ) : (
                <form onSubmit={handleManualCreate} className="space-y-4" id="manual-form">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400">Subject title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. PMP Certification, CFA Level 1"
                      required
                      className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/60 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-400">Description <span className="text-gray-600">(optional)</span></label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What is this subject about?"
                      rows={3}
                      className="w-full bg-[#1a1a1a] border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-violet-500/60 transition-all resize-none"
                    />
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer — only for manual form */}
        {(step === "form" || step === "saving") && !uploadMode && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/8 shrink-0">
            <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-300 transition-colors px-4 py-2">
              Cancel
            </button>
            <button
              type="submit"
              form="manual-form"
              disabled={!title.trim() || step === "saving"}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors"
            >
              {step === "saving" ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : "Create Subject"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
