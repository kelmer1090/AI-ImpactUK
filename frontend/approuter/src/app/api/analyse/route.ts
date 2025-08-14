export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Call FastAPI
  let result: any;
  const resp = await fetch(`${apiBase}/analyse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  result = await resp.json();
  if (!resp.ok) {
    return NextResponse.json({ error: "analysis_failed", detail: result }, { status: resp.status });
  }

  // Ensure session cookie (await cookies())
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

  // Persist with Prisma
  const saved = await prisma.project.create({
    data: {
      sessionId,
      title: body.title ?? body.project_title ?? "Untitled",
      description: body.description ?? "",
      data_types: Array.isArray(body.data_types) ? body.data_types.join(", ") : body.data_types ?? null,
      model_type: body.model_type ?? null,
      deployment_env: body.deployment_env ?? null,
      special_category_data: !!body.special_category_data,
      processes_personal_data: !!body.processes_personal_data,
      privacy_techniques: Array.isArray(body.privacy_techniques) ? body.privacy_techniques.join(", ") : body.privacy_techniques ?? null,
      explainability_tooling: body.explainability_tooling ?? null,
      interpretability_rating: body.interpretability_rating ?? null,
      drift_detection: body.drift_detection ?? null,
      retraining_cadence: body.retraining_cadence ?? null,
      penetration_tested: typeof body.penetration_tested === "boolean" ? body.penetration_tested : false,
      assessments: { create: [{ flags: result.flags }] },
    },
  });

  return NextResponse.json({ ...result, projectId: saved.id }, { status: 200 });
}
