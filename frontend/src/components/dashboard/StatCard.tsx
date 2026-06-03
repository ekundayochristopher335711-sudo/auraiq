import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  trend?: number;
  color?: "violet" | "emerald" | "amber" | "blue" | "pink";
  size?: "sm" | "lg";
}

const colorMap = {
  violet: { bg: "bg-violet-500/10", icon: "text-violet-400", value: "text-white" },
  emerald: { bg: "bg-emerald-500/10", icon: "text-emerald-400", value: "text-emerald-400" },
  amber: { bg: "bg-amber-500/10", icon: "text-amber-400", value: "text-amber-400" },
  blue: { bg: "bg-blue-500/10", icon: "text-blue-400", value: "text-blue-400" },
  pink: { bg: "bg-pink-500/10", icon: "text-pink-400", value: "text-pink-400" },
};

export function StatCard({ label, value, sub, icon: Icon, trend, color = "violet", size = "sm" }: StatCardProps) {
  const c = colorMap[color];
  return (
    <div className="rounded-2xl bg-[#141414] border border-white/8 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", c.bg)}>
          <Icon size={15} className={c.icon} />
        </div>
      </div>
      <div>
        <p className={cn("font-bold", c.value, size === "lg" ? "text-3xl" : "text-2xl")}>{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <p className={cn("text-xs font-medium", trend >= 0 ? "text-emerald-400" : "text-red-400")}>
          {trend >= 0 ? "+" : ""}{trend}% vs last week
        </p>
      )}
    </div>
  );
}
