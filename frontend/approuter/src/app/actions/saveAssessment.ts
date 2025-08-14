"use server";
import { prisma } from "@/lib/prisma";
import { getOrCreateSessionId } from "@/lib/session";

export type ProjectPayload = {
  title: string;
  description: string;
  data_types?: string;
  model_type?: string;
  deployment_env?: string;
  special_category_data?: boolean;
  processes_personal_data?: boolean;
  privacy_techniques?: string;
  explainability_tooling?: string;
  interpretability_rating?: string;
  drift_detection?: string;
  retraining_cadence?: string;
  penetration_tested?: boolean;
};

export async function saveAssessment(project: ProjectPayload, flags: unknown) {
  const sessionId = getOrCreateSessionId();
  const created = await prisma.project.create({
    data: {
      sessionId,
      ...project,
      assessments: { create: [{ flags: flags as any }] },
    },
    include: { assessments: true },
  });
  return created;
}
