"use client";

type Flag = { severity: "red"|"amber"|"green"; meta?: { phase?: string } };
const phases = ["data","model","deployment"] as const;

export default function RagByPhase({ flags }:{ flags: Flag[] }) {
  const counts: Record<string, Record<string, number>> = {};
  phases.forEach(p => counts[p] = { red:0, amber:0, green:0 });

  (flags||[]).forEach(f => {
    const phase = (f.meta?.phase || "model") as (typeof phases)[number];
    if (!counts[phase]) counts[phase] = { red:0, amber:0, green:0 };
    counts[phase][f.severity] += 1;
  });

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {phases.map(p => {
        const total = Object.values(counts[p]).reduce((a,b)=>a+b,0) || 1;
        return (
          <div key={p} className="rounded-xl border p-4 bg-white">
            <div className="text-sm font-medium capitalize mb-2">{p} phase</div>
            <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden flex">
              <div style={{width:`${(counts[p].red/total)*100}%`}} className="h-full bg-red-500" />
              <div style={{width:`${(counts[p].amber/total)*100}%`}} className="h-full bg-yellow-400" />
              <div style={{width:`${(counts[p].green/total)*100}%`}} className="h-full bg-green-500" />
            </div>
            <div className="mt-2 text-xs text-gray-600 flex gap-3">
              <span>🔴 {counts[p].red}</span>
              <span>🟠 {counts[p].amber}</span>
              <span>🟢 {counts[p].green}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
