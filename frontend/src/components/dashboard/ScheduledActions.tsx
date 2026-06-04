import { Calendar, Shield, RefreshCcw, Plus } from "lucide-react";
import Link from "next/link";

const ACTIONS = [
  { icon: RefreshCcw, label: "Review due cards", detail: "Open Flashcards to continue your learning", color: "text-violet-400" },
  { icon: Calendar, label: "Create a study plan", detail: "Add a subject and upload materials", color: "text-blue-400" },
  { icon: Shield, label: "Track mastery progress", detail: "Build streaks with daily review", color: "text-emerald-400" },
];

export function ScheduledActions() {
  return (
    <div className="rounded-2xl bg-[#141414] border border-white/8 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled Actions</p>
        <button className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
          <Plus size={13} className="text-gray-400" />
        </button>
      </div>
      <div className="space-y-2.5">
        {ACTIONS.map(({ icon: Icon, label, detail, color }) => (
          <div key={label} className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors shrink-0">
              <Icon size={14} className={color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 font-medium truncate">{label}</p>
              <p className="text-xs text-gray-500">{detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 text-center">
        <Link href="/subjects" className="text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors">
          Add a subject to personalize this section
        </Link>
      </div>
    </div>
  );
}
