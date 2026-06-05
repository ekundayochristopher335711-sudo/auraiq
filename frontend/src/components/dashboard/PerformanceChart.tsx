"use client";
import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

interface PerformanceChartProps {
  data: { date: string; score: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-bold text-violet-400">{payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

type Period = "Week" | "Month" | "Year";

export function PerformanceChart({ data }: PerformanceChartProps) {
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState<Period>("Month");
  useEffect(() => setMounted(true), []);

  const sliced = period === "Week" ? data.slice(-7) : period === "Month" ? data.slice(-30) : data;
  const filled = sliced.length > 0 ? sliced : [
    { date: "Mon", score: 0 }, { date: "Tue", score: 0 }, { date: "Wed", score: 0 },
    { date: "Thu", score: 0 }, { date: "Fri", score: 0 }, { date: "Sat", score: 0 }, { date: "Sun", score: 0 },
  ];

  return (
    <div className="rounded-2xl bg-[#141414] border border-white/8 p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Study Performance</p>
          <p className="text-sm text-gray-300 mt-0.5">Accuracy trend over sessions</p>
        </div>
        <div className="flex gap-1">
          {(["Week", "Month", "Year"] as Period[]).map((t) => (
            <button key={t} onClick={() => setPeriod(t)} className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${t === period ? "bg-violet-600/20 text-violet-400" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {!mounted ? <div className="h-45" /> : <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={filled} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
          <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#7c3aed"
            strokeWidth={2}
            fill="url(#scoreGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#7c3aed", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>}
    </div>
  );
}
