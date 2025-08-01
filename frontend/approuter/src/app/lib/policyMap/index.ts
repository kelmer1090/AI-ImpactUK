// frontend/approuter/src/app/lib/policyMap/index.ts

import { icoAuditPolicyMap } from "./ico";
import { dsitPolicyMap } from "./dsit";
import { iso42001PolicyMap } from "./iso";

// Merge all into a single map for easy lookups
export const policyMap = {
  ...icoAuditPolicyMap,
  ...dsitPolicyMap,
  ...iso42001PolicyMap,
};

// Export per-framework as well
export { icoAuditPolicyMap, dsitPolicyMap, iso42001PolicyMap };
