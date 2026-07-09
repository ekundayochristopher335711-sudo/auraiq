"use client";
import { useState, useRef, useEffect } from "react";
import { Brain, Send, ChevronDown, Sparkles, BookOpen, ImagePlus, X, History, Plus, Trash2, Loader2 } from "lucide-react";
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
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [pastChats, setPastChats] = useState<{ id: number; title: string | null; updated_at: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);

  const welcomeFor = (subj: string) =>
    subj
      ? `Hi! I'm your AI Tutor for **${subj}**.\n\nI use the Socratic method — I'll guide you to understand concepts deeply rather than just giving you answers. Ask me to explain something, work through a practice problem, or quiz you on key topics.\n\nWhat would you like to explore?`
      : `Hi! I'm your AI Tutor. Create a subject to get study help tailored to your course, or ask me a general study question to get started.`;

  const refreshHistory = (subj: string) => {
    api.conversations.list(subj || undefined).then((l) => setPastChats(l as any)).catch(() => setPastChats([]));
  };

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

  const startNewChat = () => {
    setConversationId(null);
    setMessages([{ id: "welcome", role: "assistant", content: welcomeFor(subject) }]);
    setInput("");
    setShowHistory(false);
  };

  const resumeChat = async (id: number) => {
    try {
      const convo = await api.conversations.get(id);
      const msgs: Message[] = (convo.messages ?? []).map((m: any, i: number) => ({
        id: `h-${id}-${i}`, role: m.role, content: m.content, imageUrl: m.imageUrl,
      }));
      setConversationId(id);
      setMessages(msgs.length ? msgs : [{ id: "welcome", role: "assistant", content: welcomeFor(subject) }]);
      setShowHistory(false);
    } catch { /* ignore */ }
  };

  const removeChat = async (id: number) => {
    try { await api.conversations.delete(id); } catch { /* ignore */ }
    setPastChats((prev) => prev.filter((c) => c.id !== id));
    if (id === conversationId) startNewChat();
  };

  // Persist the conversation (create on first exchange, then update). Best-effort:
  // if the conversations table doesn't exist yet, the tutor still works.
  const persist = async (msgs: Message[]) => {
    const payload = msgs
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content, ...(m.imageUrl ? { imageUrl: m.imageUrl } : {}) }));
    if (payload.length === 0) return;
    try {
      if (conversationId) {
        await api.conversations.update(conversationId, payload as any);
      } else {
        const firstUser = msgs.find((m) => m.role === "user")?.content ?? "New chat";
        const title = (firstUser || "New chat").slice(0, 60);
        const id = await api.conversations.create(subject || "", title, payload as any);
        setConversationId(id);
        refreshHistory(subject);
      }
    } catch { /* table may not exist — ignore */ }
  };

  // When the subject changes, load its most recent conversation (resume) or start fresh
  useEffect(() => {
    let cancelled = false;
    (async () => {
      refreshHistory(subject);
      try {
        const list = await api.conversations.list(subject || undefined);
        if (cancelled) return;
        if (list.length > 0) { await resumeChat(list[0].id); return; }
      } catch { /* ignore */ }
      if (!cancelled) startNewChat();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const withUser = [...messages, userMsg];

    setMessages(withUser);
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
      const withReply: Message[] = [...withUser, { id: `a-${Date.now()}`, role: "assistant", content: res.reply }];
      setMessages(withReply);
      persist(withReply);   // save the conversation so it can be resumed later
    } catch (err: any) {
      const errorMessage = err?.message ?? "Unknown error";
      const isWakeUpError = /waking up|backend|timed out/i.test(errorMessage);
      if (isWakeUpError) {
        setBackendError(errorMessage);
      }
      setMessages([...withUser, {
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

        <div className="flex items-center gap-1.5 shrink-0">
          {/* New chat */}
          <button
            onClick={startNewChat}
            title="New chat"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#141414] border border-white/10 hover:border-white/20 text-gray-400 hover:text-violet-400 transition-colors"
          >
            <Plus size={15} />
          </button>

          {/* Chat history */}
          <div>
            <button
              onClick={() => setShowHistory((v) => !v)}
              title="Chat history"
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#141414] border border-white/10 hover:border-white/20 text-gray-400 hover:text-violet-400 transition-colors"
            >
              <History size={15} />
            </button>
            {showHistory && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowHistory(false)} />
                {/* Anchored to the header (right-4) so it never runs off-screen on mobile */}
                <div className="absolute right-4 top-16 w-64 max-w-[calc(100vw-2rem)] max-h-80 overflow-y-auto bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 py-1">
                  <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                    {subject ? `${subject} chats` : "Chat history"}
                  </p>
                  {pastChats.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-gray-500">No saved chats yet</p>
                  ) : pastChats.map((c) => (
                    <div
                      key={c.id}
                      className={cn("group flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors", c.id === conversationId && "bg-violet-500/10")}
                    >
                      <button onClick={() => resumeChat(c.id)} className="flex-1 min-w-0 text-left">
                        <p className={cn("text-xs truncate", c.id === conversationId ? "text-violet-300" : "text-gray-300")}>{c.title || "Untitled chat"}</p>
                        <p className="text-[10px] text-gray-600">{new Date(c.updated_at).toLocaleDateString()}</p>
                      </button>
                      <button onClick={() => removeChat(c.id)} title="Delete" className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all shrink-0">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Subject selector */}
          <div className="relative">
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
