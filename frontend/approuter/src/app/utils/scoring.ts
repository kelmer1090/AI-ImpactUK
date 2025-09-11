// src/utils/scoring.ts
export type Severity = "red" | "amber" | "green";
export type Flag = {
  id?: string;
  severity: Severity;
  reason: string;
  mitigation?: string | null;
  clause?: string;
  meta?: { phase?: "data" | "model" | "deployment"; [k: string]: any };
};

export function ragCounts(flags: Flag[]) {
  return flags.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    },
    { red: 0, amber: 0, green: 0 } as Record<Severity, number>
  );
}

/**
 * Deterministic risk label:
 * - High if any RED
 * - Medium if ≥ 2 AMBER
 * - else Low
 */
export function scoreLabel(flags: Flag[]) {
  const { red, amber } = ragCounts(flags);
  if (red > 0) return { score: 3, label: "High" as const };
  if (amber >= 2) return { score: 2, label: "Medium" as const };
  return { score: 1, label: "Low" as const };
}
