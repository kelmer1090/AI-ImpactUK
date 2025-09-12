// Run with: pnpm tsx scripts/exportPolicyMap.ts
//   Reads raw policy maps (DSIT / ICO / ISO) from the frontend.
//   Normalises entries (ensures IDs, trims text, validates framework).
//   Merges into one unified policy_corpus.json.
//   Saves the file in /backend for use by the API.

import { writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as RawMap from "../src/app/lib/policyMap";

type RawClause = {
  id?: string;
  label?: string;
  text?: string;
  link?: string;
  category?: string;
  document?: string;
  framework?: string;
  phase?: "data" | "model" | "deployment" | string;
  dimension?: "accuracy" | "robustness" | "bias" | "privacy" | "security" | "reliability" | "explainability" | "resilience" | string;
};

type ExportClause = {
  id: string;
  label: string;
  text: string;
  link?: string;
  category?: string;
  document?: string;
  framework: "DSIT" | "ICO" | "ISO";
  phase?: string;
  dimension?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function asArray(x: any): RawClause[] {
  if (!x) return [];
  if (Array.isArray(x)) return x as RawClause[];
  const vals = Object.values(x).flat();
  return vals.filter((v) => v && typeof v === "object") as RawClause[];
}

function ensureId(prefix: "DSIT" | "ICO" | "ISO", i: number, r: RawClause): string {
  if (r.id && String(r.id).trim()) return String(r.id).trim();
  const base =
    (r.label?.toLowerCase().replace(/[^\w]+/g, "-") ||
      r.text?.slice(0, 40)?.toLowerCase().replace(/[^\w]+/g, "-") ||
      "clause") + "-" + i;
  return `${prefix}-${base}`;
}

function normFramework(prefix: string | undefined, fallback: "DSIT" | "ICO" | "ISO") {
  const f = (prefix || "").toUpperCase();
  if (f === "DSIT" || f === "ICO" || f === "ISO") return f;
  return fallback;
}

function normalize(prefix: "DSIT" | "ICO" | "ISO", raw: RawClause[]): ExportClause[] {
  return raw
    .filter((r) => (r.text ?? "").trim().length > 0)
    .map((r, i) => ({
      id: ensureId(prefix, i, r),
      label: (r.label || "").trim() || `${prefix} clause`,
      text: (r.text || "").trim(),
      link: r.link || undefined,
      category: r.category || undefined,
      document: r.document || undefined,
      framework: normFramework(r.framework, prefix) as ExportClause["framework"],
      phase: r.phase || undefined,
      dimension: r.dimension || undefined,
    }));
}

const dsitRaw = asArray((RawMap as any).dsit ?? (RawMap as any).DSIT ?? (RawMap as any).default?.dsit);
const icoRaw  = asArray((RawMap as any).ico  ?? (RawMap as any).ICO  ?? (RawMap as any).default?.ico);
const isoRaw  = asArray((RawMap as any).iso  ?? (RawMap as any).ISO  ?? (RawMap as any).default?.iso);

let merged: ExportClause[] = [];
if (!dsitRaw.length && !icoRaw.length && !isoRaw.length) {
  const flatObj = (RawMap as any).policyMap ?? (RawMap as any).default ?? (RawMap as any);
  const entries = Object.entries(flatObj || {}) as [string, any][];
  if (!entries.length) {
    console.error("❌ policyMap is empty. Check exports in src/app/lib/policyMap/*");
    process.exit(1);
  }
  merged = entries
    .map(([id, v]) => ({
      id,
      label: v?.label ?? id,
      text: v?.text ?? "",
      link: v?.link ?? "",
      category: v?.category ?? "",
      document: v?.document ?? "",
      framework: (id.startsWith("DSIT") ? "DSIT" : id.startsWith("ICO") ? "ICO" : "ISO") as
        | "DSIT"
        | "ICO"
        | "ISO",
      phase: v?.phase || undefined,
      dimension: v?.dimension || undefined,
    }))
    .filter((r) => r.text.trim().length > 0);
} else {
  const dsit = normalize("DSIT", dsitRaw);
  const ico  = normalize("ICO",  icoRaw);
  const iso  = normalize("ISO",  isoRaw);
  merged = [...dsit, ...ico, ...iso];
}

if (!merged.length) {
  console.error("❌ No clauses found to export.");
  process.exit(1);
}

// Go up THREE levels from /frontend/approuter/scripts to repo root, then into /backend
const projectRoot = path.resolve(__dirname, "../../..");
const backendPath = path.join(projectRoot, "backend");
if (!existsSync(backendPath)) {
  console.error(`❌ Backend folder not found at: ${backendPath}`);
  process.exit(1);
}

const outFile = path.join(backendPath, "policy_corpus.json");
writeFileSync(outFile, JSON.stringify(merged, null, 2), "utf8");

const byFw = merged.reduce<Record<string, number>>((acc, c) => {
  acc[c.framework] = (acc[c.framework] || 0) + 1;
  return acc;
}, {});

console.log(`✅ Wrote ${merged.length} clauses → ${outFile}`);
console.log(
  "   Breakdown:",
  Object.entries(byFw)
    .map(([fw, n]) => `${fw}:${n}`)
    .join("  "),
);
