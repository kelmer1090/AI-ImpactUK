"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import questionsData from "./questions.json";
import SectionCard from "./SectionCard";
import ProgressBar from "./ProgressBar";
import { mapWizardAnswersToApi } from "@/app/utils/mapWizardAnswersToApi"; // adjust path if needed
import { track } from "@/app/utils/telemetry";

type Answer = Record<string, any>;

interface Question {
  id: string;
  type: string;
  required?: boolean;
  minLength?: number;
  dependsOn?: string;
  showIfValue?: any;
}

function isFieldFilled(q: Question, val: any) {
  if (!q.required) return true;
  if (val == null) return false;

  if (typeof val === "string") {
    const s = val.trim();
    if (s === "") return false;
    if (q.minLength && s.length < q.minLength) return false;
  }

  switch (q.type) {
    case "textarea":
    case "text":
      return typeof val === "string" && val.trim() !== "";
    case "select":
    case "radio":
    case "likert":
      return typeof val === "string" && val.trim() !== "";
    case "checklist":
    case "multiselect":
    case "checkbox":
      return Array.isArray(val) && val.length > 0;
    case "file":
      return !!val;
    default:
      return !!val;
  }
}

export default function DescribeWizard() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answer>({});
  const [sections, setSections] = useState<any[]>([]);
  const [showWarning, setShowWarning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load questions.json
  useEffect(() => {
    setSections(questionsData as any[]);
  }, []);

  // --- derived: add a final "Review" step label ------------------------------
  const totalSteps = sections.length + 1; // extra review step
  const isReview = step === sections.length;

  // Title helper
  const projectTitle =
    answers["project_title"] ||
    answers["projectName"] ||
    answers["project_name"] ||
    "";

  // Current step questions (flatten subsections if needed)
  const questions: Question[] = useMemo(() => {
    if (isReview) return [];
    const s = sections[step];
    if (!s) return [];
    return (
      s.questions ||
      (s.subsections
        ? s.subsections.flatMap((sub: any) =>
            sub.questions.map((q: any) => ({ ...q, groupTitle: sub.title })),
          )
        : [])
    );
  }, [sections, step, isReview]);

  // Required missing for this page
  const missingRequired = isReview
    ? []
    : questions.filter((q) => {
        if (q.dependsOn && answers[q.dependsOn] !== q.showIfValue) return false;
        return q.required && !isFieldFilled(q, answers[q.id]);
      });

  function handleAnswer(id: string, value: any) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setShowWarning(false);
    setSubmitError(null);
  }

  function handleNext() {
    if (!isReview && missingRequired.length > 0) {
      setShowWarning(true);
      return;
    }
    setStep((s) => Math.min(s + 1, totalSteps - 1));
    setShowWarning(false);
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 0));
    setShowWarning(false);
  }

  // What we will send (for review)
  const apiPayload = useMemo(() => mapWizardAnswersToApi(answers), [answers]);

  // Nice helpers for the review table
  const previewRows: Array<[string, any]> = [
    ["Title", projectTitle || "—"],
    [
      "Description",
      apiPayload.description ? truncate(apiPayload.description, 280) : "—",
    ],
    ["Model type", apiPayload.model_type || "—"],
    [
      "Data types",
      Array.isArray(apiPayload.data_types) && apiPayload.data_types.length
        ? apiPayload.data_types.join(", ")
        : "—",
    ],
    ["Deployment env", apiPayload.deployment_env || "—"],
  ];

  // Submit to NEXT route, which calls FastAPI & persists via Prisma
  async function handleSubmit() {
  setLoading(true);
  setSubmitError(null);

  const started = performance.now();
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), 30_000);

  try {
    // telemetry: submit intent (no free text)
    track("analyse_submit", {
      modelType: apiPayload.model_type,
      processesPersonalData: !!apiPayload.processes_personal_data,
      hasSpecialCategoryData: !!apiPayload.special_category_data,
    });

    const res = await fetch("/api/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apiPayload),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      // safe, tokenised reason
      track("analyse_error", { action: `http_${res.status}` });
      const detail = await res.text().catch(() => "");
      throw new Error(detail || `Analysis failed (${res.status})`);
    }

    const json = (await res.json()) as { projectId?: number };
    if (!json?.projectId) {
      track("analyse_error", { action: "no_project_id" });
      throw new Error("No projectId returned from analysis.");
    }

    // success
    track("analyse_success", { projectId: json.projectId, action: "ok" });
    router.push(`/projects/${json.projectId}`);
  } catch (err: any) {
    // distinguish abort vs other errors without free text
    const isAbort = err?.name === "AbortError";
    track("analyse_error", { action: isAbort ? "timeout_or_abort" : "exception" });
    console.error("submit error", err);
    setSubmitError("Submission failed: " + (err?.message || "unexpected error"));
  } finally {
    clearTimeout(timeoutId); // ensure the timer is always cleared
    setLoading(false);
  }
}

  if (sections.length === 0) {
    return <div className="py-10 text-center">Loading…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      <div className="flex flex-col items-center mb-2">
        <ProgressBar
          currentStep={step}
          totalSteps={totalSteps}
          labels={[...sections.map((s) => s.stepLabel), "Review"]}
          noUnderline
        />
        {projectTitle && (
          <div className="mt-3 px-4 py-2 rounded-xl bg-gray-100 text-gray-800 font-semibold text-base shadow-sm text-center max-w-md truncate">
            {projectTitle}
          </div>
        )}
        <div className="text-xs text-gray-400 mt-2">
          Step {step + 1} of {totalSteps}
        </div>
      </div>

      {!isReview ? (
        <>
          <SectionCard
            section={sections[step]}
            answers={answers}
            onAnswer={handleAnswer}
            showWarning={showWarning}
          />

          {showWarning && (
            <div className="text-red-600 text-sm mt-3 mb-2 text-center">
              Please complete all required fields before continuing.
            </div>
          )}
          {submitError && (
            <div className="text-red-700 text-sm mt-2 text-center">{submitError}</div>
          )}

          <div className="flex gap-4 mt-8 justify-center">
            <button
              onClick={handleBack}
              disabled={step === 0 || loading}
              className="bg-gray-200 px-4 py-2 rounded disabled:opacity-50"
              type="button"
            >
              Back
            </button>

            <button
              onClick={handleNext}
              className={`bg-blue-600 text-white px-4 py-2 rounded ${
                missingRequired.length > 0 ? "opacity-60 cursor-not-allowed" : ""
              }`}
              type="button"
              disabled={missingRequired.length > 0 || loading}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <>
          {/* REVIEW CARD */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Review & confirm</h2>
            <p className="text-sm text-gray-600 mb-4">
              Please check the summary below. We’ll run the analysis and save this
              assessment to your session.
            </p>

            <dl className="divide-y">
              {previewRows.map(([label, value]) => (
                <div key={label} className="py-2 grid grid-cols-3 gap-4">
                  <dt className="text-sm text-gray-500">{label}</dt>
                  <dd className="col-span-2 text-sm">{String(value)}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 rounded-md bg-yellow-50 p-3 text-xs text-yellow-700">
              ⚠️ This is a preview. The final set of flags and clause citations will
              be generated after analysis.
            </div>

            {submitError && (
              <div className="text-red-700 text-sm mt-3">{submitError}</div>
            )}
            {loading && (
              <div className="text-blue-500 text-sm mt-3">Submitting…</div>
            )}
          </div>

          <div className="flex gap-4 mt-8 justify-center">
            <button
              onClick={handleBack}
              disabled={loading}
              className="bg-gray-200 px-4 py-2 rounded disabled:opacity-50"
              type="button"
            >
              Edit answers
            </button>

            <button
              onClick={handleSubmit}
              className={`bg-green-600 text-white px-4 py-2 rounded ${
                loading ? "opacity-60 cursor-not-allowed" : ""
              }`}
              type="button"
              disabled={loading}
            >
              {loading ? "Analysing…" : "Confirm & analyse"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// utils
function truncate(s: string, n: number) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
