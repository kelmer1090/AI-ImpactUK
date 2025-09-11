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
 */
export function mapWizardAnswersToApi(ans: Answers) {
  /* Project narrative */
  const title =
    String(ans.project_title ?? ans.title ?? "").trim() ||
    String(ans.P0 ?? "").trim() ||
    "Untitled";

  const description = String(ans.P1 ?? ans.description ?? "").trim();

  const sector = ans.P2 ?? null;
  const significant_decision = ans.P3 != null ? asBool(ans.P3) : undefined;

  const lifecycle_stage = ans.P4 ?? null;

  const model_type = ans.model_type ?? ans.modelType ?? ans.P5 ?? null;
  const deployment_env = ans.deployment_env ?? ans.deploymentEnv ?? null;

  const data_types = asCsvArray(ans.data_types ?? ans.dataTypes ?? []);

  /* Technical */
  const metrics = String(ans.T1 ?? "").trim() || undefined;
  const validation_score = asNum(ans.T2);
  const domain_threshold_met = ans.T3 != null ? asBool(ans.T3) : undefined;

  const drift_detection = ans.drift_detection ?? ans.T4 ?? null;
  const retraining_cadence = ans.retraining_cadence ?? ans.T5 ?? null;

  const robustness_tests = String(ans.T6 ?? "").trim() || undefined;
  const robustness_above_baseline = ans.T7 != null ? asBool(ans.T7) : undefined;

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

  const sustainability_estimate =
    ans.T12 != null ? String(ans.T12) : undefined;

  // Additional robustness/security triggers
  const pre_deployment_testing =
    ans.pre_deployment_testing != null ? asBool(ans.pre_deployment_testing) : undefined;
  const access_controls_defined =
    ans.access_controls_defined != null ? asBool(ans.access_controls_defined) : undefined;
  const supply_chain_review =
    ans.supply_chain_review != null ? asBool(ans.supply_chain_review) : undefined;

  /* Socio-Technical */
  const explainability_channels = asCsvArray(ans.S12 ?? []);
  const explainability_tooling =
    ans.explainability_tooling ??
    ans.explainabilityTooling ??
    (ans.S13 != null ? String(ans.S13) : null);

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

  // Role + DPIA risk level (strings; rules compare case-insensitively)
  const controller_role =
    typeof ans.controller_role === "string" ? ans.controller_role.trim() : ans.controller_role ?? null;
  const risk_level =
    typeof ans.risk_level === "string" ? ans.risk_level.trim() : ans.risk_level ?? null;

  // Safety
  const credible_harms = asCsvArray(ans.credible_harms ?? ans.S18 ?? []);
  const safety_mitigations = asCsvArray(ans.safety_mitigations ?? ans.S19 ?? []);

  // Bias
  const bias_evidence = (ans.S20 as File | string | undefined) ?? undefined;
  const bias_tests = ans.S21 ?? null;
  const bias_status = ans.S22 ?? null;

  // Transparency & labelling triggers
  const outputs_exposed_to_end_users =
    ans.outputs_exposed_to_end_users != null ? asBool(ans.outputs_exposed_to_end_users) : undefined;
  const output_label_includes_probabilistic =
    ans.output_label_includes_probabilistic != null
      ? asBool(ans.output_label_includes_probabilistic)
      : undefined;

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

  // Oversight / automation-bias triggers
  const human_oversight_defined =
    ans.human_oversight_defined != null ? asBool(ans.human_oversight_defined) : undefined;
  const automation_bias_controls_defined =
    ans.automation_bias_controls_defined != null
      ? asBool(ans.automation_bias_controls_defined)
      : undefined;

  /* “Plus” topics */
  const lineage_doc_present = ans.P29 != null ? !!ans.P29 : undefined;

  const retention_defined = ans.P30 != null ? asBool(ans.P30) : undefined;

  const diversity_steps = String(ans.P31 ?? "").trim() || undefined;

  const community_reviews = ans.P32 != null ? asBool(ans.P32) : undefined;

  /* Build payload */
  return {
    // core
    title,
    description,
    data_types,
    model_type,
    deployment_env,

    // privacy
    processes_personal_data,
    special_category_data,
    privacy_techniques,
    controller_role,
    risk_level,

    // explainability / interpretability
    explainability_tooling,
    explainability_channels,
    interpretability_rating,

    // fairness / accountability / transparency
    fairness_definition,
    accountable_owner,
    model_cards_published,
    documentation_consumers,
    outputs_exposed_to_end_users,
    output_label_includes_probabilistic,

    // ops
    drift_detection,
    retraining_cadence,
    penetration_tested,

    // extras for rules
    sector,
    significant_decision,
    lifecycle_stage,

    metrics,
    validation_score,
    domain_threshold_met,

    robustness_tests,
    robustness_above_baseline,
    generative_risk_above_baseline,
    pre_deployment_testing,
    access_controls_defined,
    supply_chain_review,

    worst_vuln_fix,
    safe_mode,
    mttr_target_hours,
    sustainability_estimate,

    key_features,
    credible_harms,
    safety_mitigations,

    bias_evidence,
    bias_tests,
    bias_status,

    fairness_stakeholders,
    escalation_route,

    lineage_doc_present,
    retention_defined,
    diversity_steps,
    community_reviews,

    // oversight / bias controls
    human_oversight_defined,
    automation_bias_controls_defined,
  };
}

export default mapWizardAnswersToApi;
