"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

type Counts = { red: number; amber: number; green: number };

export default function RagBar({ counts }: { counts: Counts }) {
  const data = [{ name: "phase", ...counts }];

  // If everything is zero, show an empty, subtle bar with "No flags"
  const total = counts.red + counts.amber + counts.green;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={80}>
        <BarChart layout="vertical" data={data} margin={{ top: 8, right: 10, left: 10, bottom: 8 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" hide />
          <Tooltip />
          <Bar dataKey="green" stackId="a" fill="#22c55e" radius={[4, 0, 0, 4]} />
          <Bar dataKey="amber" stackId="a" fill="#facc15" />
          <Bar dataKey="red"   stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
      {total === 0 && (
        <div className="text-[11px] text-gray-400 text-right pr-1 -mt-2">No flags</div>
      )}
    </div>
  );
}
