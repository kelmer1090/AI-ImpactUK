// src/app/utils/mapWizardAnswersToApi.ts

type Answers = Record<string, any>;

/* ── helpers ──────────────────────────────────────────────────────────────── */
const asBool = (v: any): boolean => {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return ["y", "yes", "true", "1", "on"].includes(s);
  }
  return !!v;
};

const asCsvArray = (v: any): string[] => {
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string") {
    return v
      .split(/[,;\n]/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const asNum = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ── main mapper ──────────────────────────────────────────────────────────── */
/**
 * Map the multi-step wizard answers (IDs from questions.json)
 * into the POST /api/analyse payload (ProjectInput + extras).
 *
 * Supported IDs:
 * - Narrative: project_title, P1..P5
 * - Technical: T1..T12
 * - Socio-Technical: S12..S22
 * - Guiding Principles: G23..G28
 * - “Plus” Topics: P29..P32
 */
export function mapWizardAnswersToApi(ans: Answers) {
  /* Project narrative */
  const title =
    String(ans.project_title ?? ans.title ?? "").trim() ||
    String(ans.P0 ?? "").trim() ||
    "Untitled";

  const description = String(ans.P1 ?? ans.description ?? "").trim();

  const sector = ans.P2 ?? null; // for retrieval only (not stored now)
  const significant_decision =
    ans.P3 != null ? asBool(ans.P3) : undefined; // retrieval flag

  const lifecycle_stage = ans.P4 ?? null; // retrieval signal

  // Primary model family — align to backend "model_type"
  const model_type = ans.model_type ?? ans.modelType ?? ans.P5 ?? null;

  // We don't currently have a field for deployment env in the wizard
  const deployment_env = ans.deployment_env ?? ans.deploymentEnv ?? null;

  // data_types (placeholder; if you add a control later it will land here)
  const data_types = asCsvArray(ans.data_types ?? ans.dataTypes ?? []);

  /* Technical */
  const metrics = String(ans.T1 ?? "").trim() || undefined;
  const validation_score = asNum(ans.T2); // number if provided
  const domain_threshold_met =
    ans.T3 != null ? asBool(ans.T3) : undefined;

  const drift_detection = ans.drift_detection ?? ans.T4 ?? null;
  const retraining_cadence = ans.retraining_cadence ?? ans.T5 ?? null;

  const robustness_tests = String(ans.T6 ?? "").trim() || undefined;
  const robustness_above_baseline =
    ans.T7 != null ? asBool(ans.T7) : undefined;

  // NEW: GenAI risk
  const generative_risk_above_baseline =
    ans.T7b != null ? asBool(ans.T7b) : undefined;

  const penetration_tested =
    typeof ans.penetration_tested === "boolean"
      ? ans.penetration_tested
      : ans.T8 != null
      ? asBool(ans.T8)
      : false;

  const worst_vuln_fix = String(ans.T9 ?? "").trim() || undefined;

  const safe_mode = String(ans.T10 ?? "").trim() || undefined;
  const mttr_target_hours = asNum(ans.T11);

  // NEW: Sustainability estimate (keep as string for now)
  const sustainability_estimate =
    ans.T12 != null ? String(ans.T12) : undefined;

  /* Socio-Technical */
  const explainability_channels = asCsvArray(ans.S12 ?? []);
  const explainability_tooling =
    ans.explainability_tooling ??
    ans.explainabilityTooling ??
    (ans.S13 != null ? String(ans.S13) : null); // e.g., "SHAP, LIME, custom"

  const interpretability_rating =
    ans.interpretability_rating ??
    ans.interpretabilityRating ??
    (ans.S14 != null ? String(ans.S14) : null);

  const key_features = String(ans.S15 ?? "").trim() || undefined;

  // Privacy
  const processes_personal_data =
    typeof ans.processes_personal_data === "boolean"
      ? ans.processes_personal_data
      : ans.S16 != null
      ? asBool(ans.S16)
      : undefined;

  const s16a = asCsvArray(ans.S16a);
  const special_category_data =
    typeof ans.special_category_data === "boolean"
      ? ans.special_category_data
      : s16a.includes("Special-category");

  const privacy_techniques = asCsvArray(
    ans.privacy_techniques ?? ans.privacyTechniques ?? ans.S17 ?? [],
  );

  // Safety
  const credible_harms = asCsvArray(ans.credible_harms ?? ans.S18 ?? []);
  const safety_mitigations = asCsvArray(ans.safety_mitigations ?? ans.S19 ?? []);

  // Bias
  const bias_evidence = (ans.S20 as File | string | undefined) ?? undefined; // UI may pass a File or link
  const bias_tests = ans.S21 ?? null; // single-select string
  const bias_status = ans.S22 ?? null; // radio string

  /* Guiding Principles */
  const fairness_definition = asCsvArray(
    ans.fairness_definition ?? ans.fairnessDefinition ?? ans.G23 ?? [],
  );
  const fairness_stakeholders = String(ans.G24 ?? "").trim() || undefined;

  const accountable_owner =
    ans.accountable_owner ?? ans.accountableOwner ?? ans.G25 ?? null;

  const escalation_route = String(ans.G26 ?? "").trim() || undefined;

  const model_cards_published =
    typeof ans.model_cards_published === "boolean"
      ? ans.model_cards_published
      : ans.G27 != null
      ? asBool(ans.G27)
      : null;

  const documentation_consumers = asCsvArray(ans.G28 ?? []);

  /* “Plus” topics */
  const lineage_doc_present =
    ans.P29 != null ? !!ans.P29 : undefined; // file/link presence

  const retention_defined =
    ans.P30 != null ? asBool(ans.P30) : undefined;

  const diversity_steps = String(ans.P31 ?? "").trim() || undefined;

  const community_reviews =
    ans.P32 != null ? asBool(ans.P32) : undefined;

  /* Build payload (backend will ignore unknown keys safely) */
  return {
    // core (persisted today)
    title,
    description,
    data_types,
    model_type,
    deployment_env,

    // privacy (persisted today)
    processes_personal_data,
    special_category_data,
    privacy_techniques,

    // explainability / interpretability (persisted today)
    explainability_tooling,
    interpretability_rating,

    // fairness / accountability / transparency (persisted today)
    fairness_definition,
    accountable_owner,
    model_cards_published,

    // ops (persisted today)
    drift_detection,
    retraining_cadence,
    penetration_tested,

    // additional structured context (not all persisted yet, but useful for retrieval & rules)
    sector,
    significant_decision,
    lifecycle_stage,

    metrics,
    validation_score,
    domain_threshold_met,

    robustness_tests,
    robustness_above_baseline,
    generative_risk_above_baseline,

    worst_vuln_fix,
    safe_mode,
    mttr_target_hours,
    sustainability_estimate,

    explainability_channels,
    key_features,

    credible_harms,
    safety_mitigations,

    bias_evidence,
    bias_tests,
    bias_status,

    fairness_stakeholders,
    escalation_route,
    documentation_consumers,

    lineage_doc_present,
    retention_defined,
    diversity_steps,
    community_reviews,
  };
}

export default mapWizardAnswersToApi;
