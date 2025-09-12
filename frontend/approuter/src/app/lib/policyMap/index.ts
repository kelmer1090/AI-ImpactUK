// frontend/approuter/src/app/lib/policyMap/index.ts

import { icoAuditPolicyMap } from "./ico";
import { dsitPolicyMap } from "./dsit";
import { iso42001PolicyMap } from "./iso";

/** Shared enums used across UI, exporter, and backend enrichment */
export type Phase = "data" | "model" | "deployment";

export type Dimension =
  | "accuracy"
  | "reliability"
  | "robustness"
  | "security"
  | "resilience"
  | "sustainability"
  | "genaiRisk"
  | "bias"
  | "privacy"
  | "explainability";

/** Clause shape used in the frontend policy maps.
 *  `phase` and `dimension` here so backward-compatible,
 *  but the exporter will infer them if missing.
 */
export type PolicyClause = {
  label: string;
  text: string;
  link?: string;
  category?: string;
  document?: string;
  framework?: "DSIT" | "ICO" | "ISO";
  phase?: Phase;
  dimension?: Dimension;
};

/** A handy alias for a keyed map of policy clauses */
export type PolicyMap = Record<string, PolicyClause>;

// all frameworks merged into a single lookup map
export const policyMap: PolicyMap = {
  ...icoAuditPolicyMap,
  ...dsitPolicyMap,
  ...iso42001PolicyMap,
};

// Export per-framework maps and types
export { icoAuditPolicyMap, dsitPolicyMap, iso42001PolicyMap };
