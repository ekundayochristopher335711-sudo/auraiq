"use client";
import { useState, useRef, useEffect } from "react";
import { Brain, Send, ChevronDown, Sparkles, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const SUBJECTS = [
  "Risk Management",
  "Cost Control",
  "Stakeholder Engagement",
  "Quality Management",
  "Agile Frameworks",
  "Procurement",
];

const SUGGESTIONS: Record<string, string[]> = {
  "Risk Management": [
    "Explain Monte Carlo Analysis in simple terms",
    "What's the difference between qualitative and quantitative risk analysis?",
    "How do I calculate Expected Monetary Value (EMV)?",
    "Walk me through the four risk response strategies",
  ],
  "Cost Control": [
    "How do I calculate the Cost Performance Index?",
    "What is Estimate at Completion (EAC)?",
    "Explain the difference between EV, AC, and PV",
    "When is a project considered over budget?",
  ],
  "Agile Frameworks": [
    "What happens in a Sprint Retrospective?",
    "Explain the difference between Scrum and Kanban",
    "How is velocity calculated in Scrum?",
    "What is the role of the Product Owner?",
  ],
  "Quality Management": [
    "What's the difference between quality assurance and quality control?",
    "Explain the Fishbone diagram",
    "What is a Control Chart used for?",
    "Describe the cost of quality concept",
  ],
  "Stakeholder Engagement": [
    "How do I build a stakeholder register?",
    "What's the difference between a stakeholder and a sponsor?",
    "How should I handle a resistant stakeholder?",
    "Explain the power/interest grid",
  ],
  "Procurement": [
    "What is the difference between fixed-price and cost-plus contracts?",
    "When should I use a Time and Materials contract?",
    "What is a make-or-buy decision?",
    "Explain contract termination for convenience",
  ],
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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
        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
        isUser
          ? "bg-violet-600 text-white rounded-tr-sm"
          : "bg-[#1a1a1a] text-gray-200 rounded-tl-sm border border-white/8"
      )}>
        {msg.content}
      </div>
    </div>
  );
}

export default function AiTutorPage() {
  const [subject, setSubject]           = useState("Risk Management");
  const [messages, setMessages]         = useState<Message[]>([]);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const [showSubjectMenu, setShowSubjectMenu] = useState(false);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);

  const suggestions = SUGGESTIONS[subject] ?? [];

  // Reset chat when subject changes
  useEffect(() => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: `Hi! I'm your AI Tutor for **${subject}**.\n\nI use the Socratic method — I'll guide you to understand concepts deeply rather than just giving you answers. Ask me to explain something, work through a practice problem, or quiz you on key topics.\n\nWhat would you like to explore?`,
    }]);
    setInput("");
  }, [subject]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: msg };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.ai.chat(msg, subject, history);
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.reply,
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "⚠️ The AI backend isn't connected. Start the FastAPI server (see the `backend/` folder) to enable live tutoring.\n\nIn the meantime, use Flashcards and the Exam Simulator to study offline!",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 bg-[#0d0d0d] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
            <Brain size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">AI Tutor</p>
            <p className="text-xs text-gray-500">Socratic learning companion</p>
          </div>
        </div>

        {/* Subject selector */}
        <div className="relative">
          <button
            onClick={() => setShowSubjectMenu((v) => !v)}
            className="flex items-center gap-2 bg-[#141414] border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-sm text-gray-300 transition-colors"
          >
            <BookOpen size={13} className="text-violet-400" />
            {subject}
            <ChevronDown size={12} className={cn("text-gray-500 transition-transform", showSubjectMenu && "rotate-180")} />
          </button>
          {showSubjectMenu && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
              {SUBJECTS.map((s) => (
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
          {messages.length === 1 && !loading && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-2.5 flex items-center gap-1.5">
                <Sparkles size={11} /> Suggested questions
              </p>
              <div className="flex flex-wrap gap-2">
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
          <div className="flex items-end gap-3 bg-[#141414] border border-white/10 focus-within:border-violet-500/50 rounded-2xl px-4 py-3 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${subject}...`}
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder:text-gray-600 resize-none focus:outline-none leading-relaxed"
              style={{ minHeight: "24px", maxHeight: "128px" }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">
            Enter to send · Shift+Enter for new line · Powered by GPT-4o
          </p>
        </div>
      </div>
    </div>
  );
}
