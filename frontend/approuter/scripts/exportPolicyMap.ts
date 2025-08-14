// Run with: pnpm tsx scripts/exportPolicyMap.ts
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as Map from "../src/app/lib/policyMap";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// merged can be Map.policyMap (named), default, or the module itself
const merged: Record<string, any> =
  (Map as any).policyMap ?? (Map as any).default ?? (Map as any);

const keys = merged && typeof merged === "object" ? Object.keys(merged) : [];
if (!keys.length) {
  console.error("policyMap is empty. Check the exports in lib/policyMap.");
  process.exit(1);
}

const frameworkOf = (id: string) =>
  id?.startsWith("DSIT") ? "DSIT" :
  id?.startsWith("ICO")  ? "ICO"  :
  id?.startsWith("ISO")  ? "ISO"  : "Other";

const rows = Object.entries(merged).map(([id, v]: any) => ({
  id,
  label: v?.label ?? id,
  text: v?.text ?? "",
  link: v?.link ?? "",
  category: v?.category ?? "",
  document: v?.document ?? "",
  framework: frameworkOf(id),
}));

const out = path.resolve(__dirname, "../../../backend/policy_corpus.json");
writeFileSync(out, JSON.stringify(rows, null, 2), "utf8");
console.log(`✅ Wrote ${rows.length} clauses → ${out}`);
