import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Subject {
  id: number;
  title: string;
  mastery_score: number;
}

interface TopAssetsCardProps {
  subjects: Subject[];
}

export function TopAssetsCard({ subjects }: TopAssetsCardProps) {
  const sorted = [...subjects].sort((a, b) => b.mastery_score - a.mastery_score).slice(0, 4);

  const colors = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-pink-500"];

  return (
    <div className="rounded-2xl bg-[#141414] border border-white/8 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Top Subjects</p>
        <Link href="/subjects" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors">
          View All <ArrowRight size={11} />
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">No subjects yet</p>
          <Link href="/subjects" className="text-xs text-violet-400 mt-1 inline-block">Add your first subject →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((s, i) => {
            const pct = Math.round(s.mastery_score * 100);
            const positive = pct >= 50;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${colors[i % colors.length]} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                  {s.title.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{s.title}</p>
                  <p className="text-xs text-gray-500">Mastery</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${positive ? "text-emerald-400" : "text-red-400"}`}>{pct}%</p>
                  <div className={`flex items-center justify-end gap-0.5 text-xs ${positive ? "text-emerald-500" : "text-red-500"}`}>
                    {positive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
