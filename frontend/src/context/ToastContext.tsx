"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle, AlertCircle, Info, AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem { id: string; type: ToastType; message: string; }

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (v: boolean) => void;
}

interface ToastContextValue {
  toast: {
    success: (msg: string) => void;
    error:   (msg: string) => void;
    info:    (msg: string) => void;
    warning: (msg: string) => void;
  };
  confirm: (message: string, opts?: { title?: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = { success: CheckCircle, error: AlertCircle, info: Info, warning: AlertTriangle };

const STYLES: Record<ToastType, string> = {
  success: "bg-emerald-500/15 border-emerald-500/30 text-emerald-200",
  error:   "bg-red-500/15    border-red-500/30    text-red-200",
  info:    "bg-violet-500/15 border-violet-500/30 text-violet-200",
  warning: "bg-amber-500/15  border-amber-500/30  text-amber-200",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts]       = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const toast = {
    success: (msg: string) => addToast(msg, "success"),
    error:   (msg: string) => addToast(msg, "error"),
    info:    (msg: string) => addToast(msg, "info"),
    warning: (msg: string) => addToast(msg, "warning"),
  };

  const confirm = useCallback((
    message: string,
    opts?: { title?: string; confirmLabel?: string; danger?: boolean }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        title: opts?.title ?? "Are you sure?",
        message,
        confirmLabel: opts?.confirmLabel ?? "Confirm",
        danger: opts?.danger ?? false,
        resolve,
      });
    });
  }, []);

  const handleConfirm = (result: boolean) => {
    confirmState?.resolve(result);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* ── Toast stack ─────────────────────────────────────────────── */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-4 z-[200] flex flex-col gap-2 items-center sm:items-end pointer-events-none w-[calc(100vw-2rem)] sm:w-auto max-w-sm">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-medium pointer-events-auto w-full sm:min-w-[260px]",
                STYLES[t.type]
              )}
            >
              <Icon size={15} className="shrink-0" />
              <p className="flex-1">{t.message}</p>
            </div>
          );
        })}
      </div>

      {/* ── Confirm dialog ──────────────────────────────────────────── */}
      {confirmState && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              {confirmState.danger && (
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <Trash2 size={16} className="text-red-400" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-white">{confirmState.title}</p>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">{confirmState.message}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleConfirm(false)}
                className="flex-1 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className={cn(
                  "flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors",
                  confirmState.danger
                    ? "bg-red-500 hover:bg-red-400 text-white"
                    : "bg-violet-600 hover:bg-violet-500 text-white"
                )}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
