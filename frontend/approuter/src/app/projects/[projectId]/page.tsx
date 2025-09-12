import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import RagDonut from "../../components/RagDonut";
import RagBar from "../../components/RagBar";
import RadarRisk, { type AxisScore } from "../../components/RadarRisk";
import { PolicyPopover } from "../../components/PolicyPopover";
import { policyMap } from "../../lib/policyMap";
import ExportMenu from "../../components/ExportMenu";
import { ragCounts, scoreLabel } from "../../utils/scoring";
import TelemetryMount from "../../components/TelemetryMount";

type Severity = "red" | "amber" | "green";

type Flag = {
  id: string;
  clause: string;
  severity: Severity;
  reason: string;
  mitigation?: string | null;
  evidence?: string | null;
  meta?: {
    link?: string;
    label?: string;
    framework?: string;
    phase?: "data" | "model" | "deployment" | string;
    category?: string;
    dimension?: string; // accuracy/robustness/privacy
  };
};

function fmtWhen(d: Date | string | null | undefined) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

function countsForPhase(flags: Flag[], phase: "data" | "model" | "deployment") {
  const subset = flags.filter((f) => (f.meta?.phase as any) === phase);
  return ragCounts(subset);
}

function pct(n: number, d: number) {
  return Math.round(((d ? n / d : 0) * 100) || 0);
}

const sevWeight = { red: 3, amber: 2, green: 1 } as const;

// Build radar axes (0..1 where 1 = highest risk)
function radarFromFlags(flags: Flag[]): AxisScore[] {
  const buckets = new Map<string, { sum: number; n: number }>();
  for (const f of flags) {
    const fb = policyMap[f.clause as keyof typeof policyMap] as any;
    const dim =
      f.meta?.dimension ||
      f.meta?.category ||
      fb?.category ||
      fb?.document ||
      "Other";
    const b = buckets.get(dim) || { sum: 0, n: 0 };
    b.sum += sevWeight[f.severity];
    b.n += 1;
    buckets.set(dim, b);
  }
  const to01 = (avg: number) => (avg - 1) / 2; // map 1..3 -> 0..1
  return [...buckets.entries()]
    .map(([axis, { sum, n }]) => ({ axis, value: to01(sum / n) }))
    .slice(0, 8); // keep readable
}

export default async function ProjectDetailsPage({
  params,
}: {
  params: { projectId: string };
}) {
  const id = Number(params.projectId);
  if (Number.isNaN(id)) {
    return <main className="p-6">Invalid project id.</main>;
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      assessments: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { assessments: true } },
    },
  });

  if (!project) return <main className="p-6">Project not found.</main>;

  const latest = project.assessments[0];
  const flags = ((latest?.flags as any[]) ?? []) as Flag[];
  const total = Math.max(flags.length, 1);

  const counts = ragCounts(flags);
  const scorePctGreen = pct(counts.green, total);
  const { label: riskLabel } = scoreLabel(flags);

  // Phase slices
  const dataPhase = countsForPhase(flags, "data");
  const modelPhase = countsForPhase(flags, "model");
  const deployPhase = countsForPhase(flags, "deployment");

  // Extra metrics
  const openRisk = counts.red + counts.amber;
  const greens = counts.green;
  const assessmentsCount = project._count.assessments;

  // Category bars
  const categoryScores = (() => {
    const buckets = new Map<string, { sum: number; n: number }>();
    for (const f of flags) {
      const fb = policyMap[f.clause as keyof typeof policyMap] as any;
      const cat = f.meta?.category || fb?.category || fb?.document || "Uncategorised";
      const b = buckets.get(cat) || { sum: 0, n: 0 };
      b.sum += sevWeight[f.severity];
      b.n += 1;
      buckets.set(cat, b);
    }
    const rows = [...buckets.entries()].map(([cat, { sum, n }]) => {
      const avg = sum / n;
      const label = avg <= 1.5 ? "Low" : avg <= 2.3 ? "Medium" : "High";
      const pctRisk = Math.round(((avg - 1) / 2) * 100); // [1..3] -> [0..100]
      return { cat, label, pctRisk, n };
    });
    rows.sort((a, b) => b.pctRisk - a.pctRisk);
    return rows.slice(0, 5);
  })();

  const card = "rounded-2xl border bg-white p-6";
  const statCard = "rounded-2xl border bg-white p-4";

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <TelemetryMount event="project_view" meta={{ projectId: id }} />
      
      {/* HEADER */}
      <section className={card}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <nav className="text-xs text-gray-400">
              <Link href="/projects" className="underline">Projects</Link>
              <span> / </span>
              <span className="text-gray-700">{project.title}</span>
            </nav>

            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-2xl font-semibold">{project.title}</h1>
              <span className="text-sm text-gray-500">
                Last updated {fmtWhen(project.updatedAt ?? project.createdAt)}
              </span>
            </div>

            {project.description && (
              <p className="text-gray-700">{project.description}</p>
            )}

            <div className="flex items-center gap-3">
              <div className="h-2 bg-gray-100 rounded-full w-64 overflow-hidden">
                <div
                  className={`h-full ${
                    scorePctGreen >= 67
                      ? "bg-green-500"
                      : scorePctGreen >= 34
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${scorePctGreen}%` }}
                  aria-label="Compliance progress"
                />
              </div>
              <span className="text-sm text-gray-600">{scorePctGreen}% green</span>
              <span className="text-xs px-2 py-1 rounded-md bg-gray-100">
                Overall risk: <b>{riskLabel}</b>
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/projects"
              className="px-3 py-2 rounded-lg border bg-gray-50 hover:bg-gray-100 text-sm"
            >
              ← Back to list
            </Link>
            <Link
              href="/describe"
              className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
            >
              + New assessment
            </Link>
            <ExportMenu projectId={project.id} />
          </div>
        </div>
      </section>

      {/* RAG OVERVIEW (Overall donut + 3 stacked bars) */}
      <section className="grid gap-4 md:grid-cols-4">
        {/* Overall */}
        <div className={card}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Overall</h3>
            <div className="text-xs text-gray-500">
              R:{counts.red} • A:{counts.amber} • G:{counts.green}
            </div>
          </div>
          <RagDonut counts={counts} />
        </div>

        {/* Data */}
        <div className={card}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Data</h3>
            <div className="text-xs text-gray-500">
              R:{dataPhase.red} • A:{dataPhase.amber} • G:{dataPhase.green}
            </div>
          </div>
          <RagBar counts={dataPhase} />
        </div>

        {/* Model */}
        <div className={card}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Model</h3>
            <div className="text-xs text-gray-500">
              R:{modelPhase.red} • A:{modelPhase.amber} • G:{modelPhase.green}
            </div>
          </div>
          <RagBar counts={modelPhase} />
        </div>

        {/* Deployment */}
        <div className={card}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Deployment</h3>
            <div className="text-xs text-gray-500">
              R:{deployPhase.red} • A:{deployPhase.amber} • G:{deployPhase.green}
            </div>
          </div>
          <RagBar counts={deployPhase} />
        </div>
      </section>

      {/* TECHNICAL RISK RADAR */}
      <section className={card}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium">Technical risk profile</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100">
            0 = low risk • 1 = high risk
          </span>
        </div>
        <RadarRisk scores={radarFromFlags(flags)} />
      </section>

      {/* STATS */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className={statCard}>
          <div className="text-sm text-gray-500">Open risk</div>
          <div className="text-2xl font-semibold mt-1">{counts.red + counts.amber}</div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-red-500" style={{ width: `${pct(counts.red + counts.amber, total)}%` }} />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {pct(counts.red + counts.amber, total)}% of findings are red/amber
          </div>
        </div>

        <div className={statCard}>
          <div className="text-sm text-gray-500">Green checks</div>
          <div className="text-2xl font-semibold mt-1">{greens}</div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500" style={{ width: `${pct(greens, total)}%` }} />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {pct(greens, total)}% of findings are green
          </div>
        </div>

        <div className={statCard}>
          <div className="text-sm text-gray-500">Assessments</div>
          <div className="text-2xl font-semibold mt-1">{assessmentsCount}</div>
          <div className="text-xs text-gray-500 mt-1">Latest assessment displayed below</div>
        </div>
      </section>

      {/* CATEGORY BARS */}
      {categoryScores.length > 0 && (
        <section className={card}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Risk by category</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-gray-100">Top 5</span>
          </div>
          <div className="space-y-2">
            {categoryScores.map((row) => (
              <div key={row.cat}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{row.cat}</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100">{row.label}</span>
                </div>
                <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      row.pctRisk >= 67
                        ? "bg-red-500"
                        : row.pctRisk >= 34
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{ width: `${row.pctRisk}%` }}
                  />
                </div>
                <div className="text-[11px] text-gray-400 mt-1">{row.n} flag(s)</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FLAGS */}
      <section className={card}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Active Flags</h2>
          <div className="text-xs text-gray-500">Showing latest assessment findings</div>
        </div>

        {flags.length === 0 ? (
          <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">
            No issues flagged in the latest assessment.
          </div>
        ) : (
          <ul className="grid md:grid-cols-2 gap-3">
            {flags.map((flag, i) => {
              const fallback = policyMap[flag.clause as keyof typeof policyMap] as
                | { label: string; text?: string; link?: string; category?: string; document?: string }
                | undefined;

              const clauseLink = flag.meta?.link || fallback?.link || null;
              const clauseLabel = flag.meta?.label || fallback?.label || flag.clause;
              const phase = flag.meta?.phase;

              const sevClass =
                flag.severity === "red"
                  ? "bg-red-100 text-red-700"
                  : flag.severity === "amber"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-green-100 text-green-700";

              return (
                <li key={flag.id ?? i} className="border rounded-2xl p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className={`px-2 py-0.5 rounded-full ${sevClass}`}>
                      {flag.severity.toUpperCase()}
                    </span>
                    {phase && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 capitalize">
                        {phase}
                      </span>
                    )}
                    {clauseLink ? (
                      <a href={clauseLink} target="_blank" rel="noreferrer" className="underline text-blue-600">
                        {clauseLabel}
                      </a>
                    ) : fallback ? (
                      <PolicyPopover {...fallback} />
                    ) : (
                      <span className="text-gray-800">{clauseLabel}</span>
                    )}
                  </div>

                  <div className="text-sm mt-2">
                    <b>Reason:</b> {flag.reason}
                  </div>

                  {flag.mitigation && (
                    <div className="text-sm mt-1 rounded-md bg-yellow-50 p-2">
                      <b>Mitigation:</b> {flag.mitigation}
                    </div>
                  )}

                  {flag.evidence && (
                    <div className="text-sm italic text-gray-700 mt-1">“{flag.evidence}”</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
