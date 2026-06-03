"use client";
import { useCallback, useState } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

const ACCEPTED = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
const ACCEPTED_EXT = ".pdf, .docx, .txt";

export function DropZone({ onFile, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [staged, setStaged] = useState<File | null>(null);

  const validate = (file: File): string => {
    if (!ACCEPTED.includes(file.type)) return "Only PDF, DOCX, and TXT files are supported.";
    if (file.size > 20 * 1024 * 1024) return "File too large — maximum size is 20 MB.";
    return "";
  };

  const handle = useCallback((file: File) => {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError("");
    setStaged(file);
    onFile(file);
  }, [onFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handle(file);
  }, [handle]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handle(file);
    e.target.value = "";
  };

  const clear = () => { setStaged(null); setError(""); };

  const fmtSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  if (staged) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-violet-500/10 border border-violet-500/30 px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
          <FileText size={16} className="text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate">{staged.name}</p>
          <p className="text-xs text-gray-500">{fmtSize(staged.size)}</p>
        </div>
        {!disabled && (
          <button onClick={clear} className="text-gray-500 hover:text-red-400 transition-colors">
            <X size={15} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed cursor-pointer transition-all py-10 px-6",
          dragging
            ? "border-violet-500 bg-violet-500/10"
            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        <input type="file" accept={ACCEPTED_EXT} onChange={onInputChange} className="hidden" disabled={disabled} />
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors", dragging ? "bg-violet-500/20" : "bg-white/5")}>
          <Upload size={22} className={dragging ? "text-violet-400" : "text-gray-500"} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-300">
            {dragging ? "Drop it!" : "Drag & drop your study material"}
          </p>
          <p className="text-xs text-gray-600 mt-1">PDF, DOCX, or TXT · max 20 MB</p>
        </div>
        <span className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-gray-400 transition-colors">
          Browse files
        </span>
      </label>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs">
          <AlertCircle size={13} />
          {error}
        </div>
      )}
    </div>
  );
}
