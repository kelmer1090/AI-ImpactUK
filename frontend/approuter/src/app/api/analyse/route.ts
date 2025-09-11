// src/app/api/analyse/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // ---------- Helpers ----------
  const toBool = (v: any): boolean =>
    typeof v === "boolean"
      ? v
      : typeof v === "string"
      ? ["true", "yes", "y", "1", "on"].includes(v.toLowerCase())
      : !!v;

  const toArray = (v: any): string[] => {
    if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
    if (typeof v === "string")
      return v.split(/[,;\n]/g).map((s) => s.trim()).filter(Boolean);
    return [];
  };

  // For Prisma String[] columns with @default([]): return undefined when empty so the default applies.
  const toListOrUndefined = (v: any): string[] | undefined => {
    const arr = toArray(v);
    return arr.length ? arr : undefined;
  };

  // For Prisma String? columns we still store CSV (back-compat).
  const toCsvOrNull = (v: any): string | null => {
    const arr = toArray(v);
    return arr.length ? arr.join(", ") : null;
  };

  const toNum = (v: any): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // ---------- Call FastAPI /analyse ----------
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const resp = await fetch(`${apiBase}/analyse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const result = await resp.json();
  if (!resp.ok) {
    return NextResponse.json(
      { error: "analysis_failed", detail: result },
      { status: resp.status },
    );
  }

  // ---------- Ensure anonymous session cookie ----------
  const jar = await cookies();
  let sessionId = jar.get("aiimpact_session")?.value;
  if (!sessionId) {
    sessionId = randomUUID();
    jar.set("aiimpact_session", sessionId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // ---------- Persist Project + Assessment ----------
  const saved = await prisma.project.create({
    data: {
      sessionId,

      // Core
      title: body.title ?? body.project_title ?? "Untitled",
      description: body.description ?? "",
      data_types: toCsvOrNull(body.data_types), // String?
      model_type: body.model_type ?? null,
      deployment_env: body.deployment_env ?? null,

      // Narrative / context
      sector: body.sector ?? null,
      significant_decision:
        body.significant_decision === undefined
          ? null
          : toBool(body.significant_decision),
      lifecycle_stage: body.lifecycle_stage ?? null,

      // Privacy
      processes_personal_data:
        typeof body.processes_personal_data === "boolean"
          ? body.processes_personal_data
          : toBool(body.processes_personal_data),
      special_category_data:
        typeof body.special_category_data === "boolean"
          ? body.special_category_data
          : toBool(body.special_category_data),
      privacy_techniques: toCsvOrNull(body.privacy_techniques),
      retention_defined:
        body.retention_defined === undefined ? null : toBool(body.retention_defined),
      lineage_doc_present:
        body.lineage_doc_present === undefined ? null : toBool(body.lineage_doc_present),

      // Explainability / Interpretability
      explainability_tooling: body.explainability_tooling ?? null,
      explainability_channels: toListOrUndefined(body.explainability_channels), // String[]
      interpretability_rating:
        body.interpretability_rating != null
          ? String(body.interpretability_rating)
          : null,
      key_features: body.key_features ?? null,
      documentation_consumers: toListOrUndefined(body.documentation_consumers), // String[]

      // Fairness & Governance
      fairness_definition: toCsvOrNull(body.fairness_definition), // String?
      fairness_stakeholders: body.fairness_stakeholders ?? null,
      accountable_owner: body.accountable_owner ?? null,
      model_cards_published:
        body.model_cards_published === undefined
          ? null
          : toBool(body.model_cards_published),
      escalation_route: body.escalation_route ?? null,

      // Technical metrics / robustness
      metrics: body.metrics ?? null,
      validation_score: toNum(body.validation_score),
      domain_threshold_met:
        body.domain_threshold_met === undefined ? null : toBool(body.domain_threshold_met),
      robustness_tests: body.robustness_tests ?? null,
      robustness_above_baseline:
        body.robustness_above_baseline === undefined
          ? null
          : toBool(body.robustness_above_baseline),
      generative_risk_above_baseline:
        body.generative_risk_above_baseline === undefined
          ? null
          : toBool(body.generative_risk_above_baseline),

      // Ops / security / resilience
      drift_detection: body.drift_detection ?? null,
      retraining_cadence: body.retraining_cadence ?? null,
      penetration_tested:
        typeof body.penetration_tested === "boolean"
          ? body.penetration_tested
          : toBool(body.penetration_tested),
      worst_vuln_fix: body.worst_vuln_fix ?? null,
      safe_mode: body.safe_mode ?? null,
      mttr_target_hours: toNum(body.mttr_target_hours),

      // Sustainability
      sustainability_estimate: body.sustainability_estimate ?? null,

      // Safety inputs (arrays)
      credible_harms: toListOrUndefined(body.credible_harms),         // String[]
      safety_mitigations: toListOrUndefined(body.safety_mitigations), // String[]

      // Bias / inclusion
      bias_tests: body.bias_tests ?? null,
      bias_status: body.bias_status ?? null,
      diversity_steps: body.diversity_steps ?? null,
      community_reviews:
        body.community_reviews === undefined ? null : toBool(body.community_reviews),

      // Latest analysis snapshot
      assessments: {
        create: [
          {
            flags: Array.isArray(result?.flags) ? result.flags : [],
            corpusVersion: result?.corpus_version ?? null,
          },
        ],
      },
    },
  });

  return NextResponse.json({ ...result, projectId: saved.id }, { status: 200 });
}
