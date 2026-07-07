"use client";
import { useState, useRef, useEffect } from "react";
import { Brain, Send, ChevronDown, Sparkles, BookOpen, ImagePlus, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Subject } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center px-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-violet-500/60 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "justify-end")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
          <Brain size={13} className="text-white" />
        </div>
      )}
      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "bg-violet-600 text-white rounded-tr-sm whitespace-pre-wrap"
          : "bg-[#1a1a1a] text-gray-200 rounded-tl-sm border border-white/8"
      )}>
        {msg.imageUrl && (
          <img src={msg.imageUrl} alt="uploaded" className="rounded-xl max-w-60 mb-2 block" />
        )}
        {isUser ? msg.content : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="text-violet-300 font-semibold">{children}</strong>,
              em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
              code: ({ children }) => <code className="bg-black/40 text-violet-200 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
              h1: ({ children }) => <h1 className="text-base font-bold text-white mb-1 mt-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold text-white mb-1 mt-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-200 mb-1 mt-1">{children}</h3>,
              blockquote: ({ children }) => <blockquote className="border-l-2 border-violet-500/50 pl-3 text-gray-400 italic">{children}</blockquote>,
            }}
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function AiTutorPage() {
  const [subjects, setSubjects]         = useState<string[]>([]);
  const [subject, setSubject]           = useState("");
  const [messages, setMessages]         = useState<Message[]>([]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  const [imagePreview, setImagePreview]       = useState<string | null>(null);
  const [imageBase64, setImageBase64]         = useState<string>("");
  const [backendError, setBackendError]       = useState<string | null>(null);
  const [lastFailedUserMessage, setLastFailedUserMessage] = useState("");
  const [lastFailedImage, setLastFailedImage] = useState<string | null>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.subjects.list().then((s: Subject[]) => {
      const titles = s.map((subject) => subject.title);
      setSubjects(titles);
      setSubject((current) => current || titles[0] || "");
    }).catch(() => {});
  }, []);

  const suggestions = subject
    ? [
      `Explain the key ideas in ${subject}`,
      `Quiz me on ${subject}`,
      `Summarize the most important concepts in ${subject}`,
      `Create a short practice question about ${subject}`,
    ]
    : [];

  // Reset chat when subject changes
  useEffect(() => {
    const welcomeMessage = subject
      ? `Hi! I'm your AI Tutor for **${subject}**.\n\nI use the Socratic method — I'll guide you to understand concepts deeply rather than just giving you answers. Ask me to explain something, work through a practice problem, or quiz you on key topics.\n\nWhat would you like to explore?`
      : `Hi! I'm your AI Tutor. Create a subject to get study help tailored to your course, or ask me a general study question to get started.`;

    setMessages([{ id: "welcome", role: "assistant", content: welcomeMessage }]);
    setInput("");
  }, [subject]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const original = reader.result as string;
      // Compress image using canvas before sending
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL("image/jpeg", 0.7);
        setImagePreview(compressed);
        setImageBase64(compressed);
      };
      img.src = original;
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sendMessage = async (text: string, imageData?: string) => {
    const msg = text.trim();
    if ((!msg && !imageData) || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: msg,
      imageUrl: imageData ? imageData : imagePreview ?? undefined,
    };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLastFailedUserMessage(msg);
    setLastFailedImage(imageData ?? imageBase64 ?? null);
    setBackendError(null);
    const imgB64 = imageData ?? imageBase64;
    clearImage();
    setLoading(true);

    try {
      const res = await api.ai.chat(msg, subject, history, imgB64 || undefined);
      setBackendError(null);
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.reply,
      }]);
    } catch (err: any) {
      const errorMessage = err?.message ?? "Unknown error";
      const isWakeUpError = /waking up|backend|timed out/i.test(errorMessage);
      if (isWakeUpError) {
        setBackendError(errorMessage);
      }
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: `⚠️ AI request failed: ${errorMessage}. Please try again.`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const send = (text: string) => sendMessage(text);

  const retryAIRequest = async () => {
    if (!lastFailedUserMessage && !lastFailedImage) return;
    await sendMessage(lastFailedUserMessage, lastFailedImage ?? undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-[#0d0d0d] shrink-0 relative z-30">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
            <Brain size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">AI Tutor</p>
            <p className="text-xs text-gray-500 hidden sm:block">Socratic learning companion</p>
          </div>
        </div>

        {/* Subject selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowSubjectMenu((v) => !v)}
            className="flex items-center gap-1.5 bg-[#141414] border border-white/10 hover:border-white/20 rounded-xl px-2.5 py-2 text-sm text-gray-300 transition-colors max-w-[160px] sm:max-w-none"
          >
            <BookOpen size={13} className="text-violet-400 shrink-0" />
            <span className="truncate">{subject || "Select"}</span>
            <ChevronDown size={12} className={cn("text-gray-500 transition-transform shrink-0", showSubjectMenu && "rotate-180")} />
          </button>
          {showSubjectMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              {subjects.length === 0 ? (
                <p className="text-xs text-gray-500 px-4 py-3">No subjects yet — create one first</p>
              ) : subjects.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSubject(s); setShowSubjectMenu(false); }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 text-sm transition-colors",
                    s === subject ? "text-violet-400 bg-violet-500/10" : "text-gray-300 hover:bg-white/5"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-2xl mx-auto space-y-4">
          {backendError && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-amber-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">AI backend is waking up</p>
                  <p className="mt-1 text-sm text-amber-100/90">
                    {backendError} Please wait a moment, then retry your last request.
                  </p>
                </div>
                <button
                  onClick={retryAIRequest}
                  className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                <Brain size={13} className="text-white" />
              </div>
              <div className="bg-[#1a1a1a] border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
                <TypingIndicator />
              </div>
            </div>
          )}

          {/* Suggestion chips — only shown after the welcome message */}
          {messages.length === 1 && !loading && suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-2.5 flex items-center gap-1.5">
                <Sparkles size={11} /> Suggested questions
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-xs bg-white/4 hover:bg-white/8 border border-white/8 hover:border-white/15 text-gray-300 rounded-xl px-3 py-2 transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t border-white/8 bg-[#0d0d0d] px-4 py-3.5 shrink-0">
        <div className="max-w-2xl mx-auto">
          {/* Image preview */}
          {imagePreview && (
            <div className="relative inline-block mb-2">
              <img src={imagePreview} alt="preview" className="h-20 rounded-xl border border-white/10 object-cover" />
              <button onClick={clearImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <X size={10} className="text-white" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-3 bg-[#141414] border border-white/10 focus-within:border-violet-500/50 rounded-2xl px-4 py-3 transition-colors">
            {/* Image upload button */}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="text-gray-500 hover:text-violet-400 transition-colors shrink-0 mb-0.5">
              <ImagePlus size={17} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={imagePreview ? "Add a question about this image..." : `Ask about ${subject || "anything"}...`}
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder:text-gray-600 resize-none focus:outline-none leading-relaxed"
              style={{ minHeight: "24px", maxHeight: "128px" }}
            />
            <button
              onClick={() => send(input)}
              disabled={(!input.trim() && !imageBase64) || loading}
              className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">
            Enter to send · Shift+Enter for new line · Powered by Llama 3
          </p>
        </div>
      </div>
    </div>
  );
}
