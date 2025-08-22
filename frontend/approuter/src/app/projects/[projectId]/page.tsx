import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import RagDonut from "../../components/RagDonut";
import { PolicyPopover } from "../../components/PolicyPopover";
import { policyMap } from "../../lib/policyMap";
import ExportMenu from "../../components/ExportMenu";
import RagByPhase from "../../components/RagByPhase";

type Flag = {
  id: string;
  clause: string;
  severity: "red" | "amber" | "green";
  reason: string;
  mitigation?: string | null;
  evidence?: string | null;
  meta?: { link?: string; label?: string; framework?: string; phase?: string };
};

export default async function ProjectDetailsPage({
  params,
}: {
  params: { projectId: string };
}) {
  const id = Number(params.projectId);

  const project = await prisma.project.findUnique({
    where: { id },
    include: { assessments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!project) return <main className="p-6">Project not found.</main>;

  const latest = project.assessments[0];
  const flags = ((latest?.flags as any[]) ?? []) as Flag[];

  const counts = {
    red: flags.filter((f) => f.severity === "red").length,
    amber: flags.filter((f) => f.severity === "amber").length,
    green: flags.filter((f) => f.severity === "green").length,
  };

  // simple compliance score for a header bar
  const total = Math.max(flags.length, 1);
  const scorePct = Math.round((counts.green / total) * 100);

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-semibold">{project.title}</h1>
            <span className="text-sm text-gray-500">
              {new Date(project.createdAt).toLocaleString()}
            </span>
            <Link href="/projects" className="text-sm underline ml-2">
              back to list
            </Link>
          </div>
          {project.description && (
            <p className="text-gray-700 mt-2">{project.description}</p>
          )}
          <div className="mt-3 h-2 bg-gray-100 rounded-full w-64 overflow-hidden">
            <div
              className="h-full bg-green-500"
              style={{ width: `${scorePct}%` }}
              aria-label="Compliance progress"
            />
          </div>
        </div>
        <ExportMenu projectId={project.id} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-2xl p-4 bg-white">
          <h3 className="text-sm font-medium mb-2">Overall RAG</h3>
          <RagDonut counts={counts} />
        </div>
        <div className="border rounded-2xl p-4 bg-white">
          <h3 className="text-sm font-medium mb-2">RAG by phase</h3>
          <RagByPhase flags={flags} />
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Active Flags</h2>
        {flags.length === 0 ? (
          <p>No issues flagged.</p>
        ) : (
          <ul className="space-y-2">
            {flags.map((flag, i) => {
              const fallback = policyMap[flag.clause];
              const clauseLink = flag.meta?.link || fallback?.link || null;
              const clauseLabel =
                flag.meta?.label || fallback?.label || flag.clause;
              const phase = flag.meta?.phase;

              return (
                <li key={i} className="border rounded-xl p-3 bg-white">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100">
                      {flag.severity.toUpperCase()}
                    </span>
                    {phase && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 capitalize">
                        {phase}
                      </span>
                    )}
                    {clauseLink ? (
                      <a
                        href={clauseLink}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-blue-600"
                      >
                        {clauseLabel}
                      </a>
                    ) : (
                      <span className="text-gray-800">{clauseLabel}</span>
                    )}
                  </div>

                  <div className="text-sm mt-2">
                    <b>Reason:</b> {flag.reason}
                  </div>

                  {flag.mitigation && (
                    <div className="text-sm">
                      <b>Mitigation:</b> {flag.mitigation}
                    </div>
                  )}

                  {flag.evidence && (
                    <div className="text-sm italic text-gray-700">
                      “{flag.evidence}”
                    </div>
                  )}

                  {/* Optional richer popover if you want the full clause text */}
                  {!clauseLink && fallback && (
                    <div className="text-xs text-gray-500 mt-1">
                      <PolicyPopover {...fallback} />
                    </div>
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
