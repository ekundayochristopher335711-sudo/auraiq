"use client";
import { useState, useEffect } from "react";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";

interface ExamReadinessCardProps {
  score: number;
  streak: number;
  masteryPct: number;
}

export function ExamReadinessCard({ score, streak, masteryPct }: ExamReadinessCardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = [{ value: score, fill: "#7c3aed" }];

  const label =
    score >= 80 ? "Exam Ready" :
    score >= 60 ? "Almost There" :
    score >= 40 ? "Building Up" : "Early Stage";

  const labelColor =
    score >= 80 ? "text-emerald-400" :
    score >= 60 ? "text-amber-400" :
    "text-red-400";

  return (
    <div className="rounded-2xl bg-[#141414] border border-white/8 p-5 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Exam Readiness</p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/5 ${labelColor}`}>{label}</span>
      </div>

      <div className="relative h-44">
        {!mounted ? null : <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%" cy="60%"
            innerRadius="70%" outerRadius="90%"
            startAngle={180} endAngle={0}
            data={data}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: "#1f1f1f" }}
              dataKey="value"
              angleAxisId={0}
              cornerRadius={6}
            />
          </RadialBarChart>
        </ResponsiveContainer>}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
          <p className="text-4xl font-bold text-white">{score}<span className="text-xl text-gray-500">%</span></p>
          <p className="text-xs text-gray-500 mt-1">readiness score</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="rounded-xl bg-white/5 p-3">
          <p className="text-xs text-gray-500 mb-1">Study Streak</p>
          <p className="text-xl font-bold text-amber-400">{streak}<span className="text-sm text-gray-500"> days</span></p>
        </div>
        <div className="rounded-xl bg-white/5 p-3">
          <p className="text-xs text-gray-500 mb-1">Mastery</p>
          <p className="text-xl font-bold text-violet-400">{masteryPct}<span className="text-sm text-gray-500">%</span></p>
        </div>
      </div>
    </div>
  );
}
