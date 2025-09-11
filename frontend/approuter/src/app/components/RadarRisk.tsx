"use client";

import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Tooltip
} from "recharts";

// values should be 0..1 where 1 = worst (red), 0 = best (green)
export type AxisScore = { axis: string; value: number };

export default function RadarRisk({ scores }: { scores: AxisScore[] }) {
  const data = scores.map(s => ({ subject: s.axis, A: Math.max(0, Math.min(1, s.value)) }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
          <Tooltip />
          <Radar name="Risk" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
