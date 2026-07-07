"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, BookOpen, Trash2, MoreHorizontal, Upload, TrendingUp, Search, X } from "lucide-react";
import { api, Subject } from "@/lib/api";
import { CreateSubjectModal } from "@/components/subjects/CreateSubjectModal";
import { useToast } from "@/context/ToastContext";
import { cn } from "@/lib/utils";

const PALETTE = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-pink-500 to-rose-600",
  "from-amber-500 to-orange-600",
  "from-indigo-500 to-blue-600",
];

function MasteryRing({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const radius = 20;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="#1f1f1f" strokeWidth="4" />
        <circle cx="24" cy="24" r={radius} fill="none"
          stroke={pct >= 75 ? "#10b981" : pct >= 45 ? "#f59e0b" : "#ef4444"}
          strokeWidth="4" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          className="transition-all duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">{pct}%</span>
    </div>
  );
}

function SubjectCard({ subject, index, onDelete }: { subject: Subject; index: number; onDelete: (id: number) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const gradient = PALETTE[index % PALETTE.length];
  const pct = Math.round(subject.mastery_score * 100);
  const status = pct >= 75 ? "Strong" : pct >= 45 ? "Moderate" : "Needs Work";
  const statusColor = pct >= 75 ? "text-emerald-400" : pct >= 45 ? "text-amber-400" : "text-red-400";

  return (
    <div className="group relative rounded-2xl bg-[#141414] border border-white/8 overflow-visible hover:border-white/15 transition-all">
      <div className={cn("h-1.5 w-full bg-linear-to-r rounded-t-2xl", gradient)} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <Link href={`/subjects/${subject.id}`}
              className="text-base font-semibold text-white hover:text-violet-300 transition-colors line-clamp-1">
              {subject.title}
            </Link>
            {subject.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{subject.description}</p>
            )}
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-all">
              <MoreHorizontal size={15} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl py-1.5 w-36 shadow-xl">
                  <Link href={`/subjects/${subject.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                    onClick={() => setMenuOpen(false)}>
                    <BookOpen size={12} /> View Details
                  </Link>
                  <button onClick={() => { onDelete(subject.id); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 mb-0.5">Mastery</p>
            <p className={cn("text-sm font-semibold", statusColor)}>{status}</p>
          </div>
          <MasteryRing score={subject.mastery_score} />
        </div>
      </div>
      <div className="border-t border-white/5 px-5 py-3 flex items-center justify-between">
        <Link href={`/subjects/${subject.id}`}
          className="text-xs text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 transition-colors">
          <TrendingUp size={11} /> Study now
        </Link>
        <Link href={`/subjects/${subject.id}?upload=1`}
          className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors">
          <Upload size={11} /> Upload
        </Link>
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-4">
        <BookOpen size={28} className="text-violet-400" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">No subjects yet</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-6">
        Create your first subject manually or upload a PDF and let Recalro build your study system in seconds.
      </p>
      <button onClick={onAdd}
        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors">
        <Plus size={15} /> Add your first subject
      </button>
    </div>
  );
}

export default function SubjectsPage() {
  const [subjects, setSubjects]   = useState<Subject[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch]       = useState("");
  const { toast, confirm }        = useToast();

  const load = async () => {
    try {
      const data = await api.subjects.list();
      setSubjects(data);
    } catch {
      // backend not up yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    const subject = subjects.find((s) => s.id === id);
    const ok = await confirm(
      `"${subject?.title}" and all its flashcards will be permanently deleted.`,
      { title: "Delete subject?", confirmLabel: "Delete", danger: true }
    );
    if (!ok) return;
    try {
      await api.subjects.delete(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      toast.success("Subject deleted.");
    } catch (err: any) {
      toast.error(err.message ?? "Delete failed.");
    }
  };

  const filtered = search.trim()
    ? subjects.filter((s) =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        (s.description ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : subjects;

  return (
    <>
      <div className="p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white">Subjects</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {subjects.length > 0 ? `${subjects.length} subject${subjects.length !== 1 ? "s" : ""}` : "Manage your courses and study materials"}
            </p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors shrink-0">
            <Plus size={15} /> <span className="hidden sm:inline">New Subject</span><span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Search */}
        {subjects.length > 0 && (
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects..."
              className="w-full bg-[#141414] border border-white/8 rounded-xl pl-9 pr-9 py-2.5 text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Search results hint */}
        {search.trim() && (
          <p className="text-xs text-gray-500">
            {filtered.length > 0 ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""} for "${search}"` : `No subjects match "${search}"`}
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl bg-[#141414] border border-white/8 h-48 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.length === 0 && subjects.length === 0 ? (
              <EmptyState onAdd={() => setShowModal(true)} />
            ) : filtered.length === 0 ? (
              <div className="col-span-full flex flex-col items-center py-16 text-center">
                <p className="text-sm text-gray-500 mb-3">No subjects match your search.</p>
                <button onClick={() => setSearch("")} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Clear search</button>
              </div>
            ) : (
              <>
                {filtered.map((s, i) => (
                  <SubjectCard key={s.id} subject={s} index={i} onDelete={handleDelete} />
                ))}
                {!search && (
                  <button onClick={() => setShowModal(true)}
                    className="rounded-2xl border-2 border-dashed border-white/10 hover:border-violet-500/40 hover:bg-violet-500/5 flex flex-col items-center justify-center gap-2 py-10 text-gray-600 hover:text-violet-400 transition-all min-h-45">
                    <Plus size={24} />
                    <span className="text-sm font-medium">Add Subject</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <CreateSubjectModal onClose={() => setShowModal(false)} onCreated={load} />
      )}
    </>
  );
}
