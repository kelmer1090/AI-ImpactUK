import Link from "next/link";
import { prisma } from "../../../lib/prisma";
import RagDonut from "../../components/RagDonut";
import { PolicyPopover } from "../../components/PolicyPopover";
import { policyMap } from "../../lib/policyMap";

export default async function ProjectDetailsPage(props: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await props.params;
  const id = Number(projectId);

  const project = await prisma.project.findUnique({
    where: { id },
    include: { assessments: { orderBy: { createdAt: "desc" } } },
  });

  if (!project) return <main className="p-6">Project not found.</main>;

  const latest = project.assessments[0];
  const flags = (latest?.flags as any[]) ?? [];
  const counts = {
    red: flags.filter((f) => f.severity === "red").length,
    amber: flags.filter((f) => f.severity === "amber").length,
    green: flags.filter((f) => f.severity === "green").length,
  };

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-baseline gap-2">
        <h1 className="text-2xl font-semibold">{project.title}</h1>
        <span className="text-sm text-gray-500">
          {new Date(project.createdAt).toLocaleString()}
        </span>
        <Link href="/projects" className="text-sm underline ml-auto">
          back to list
        </Link>
      </div>

      <p className="text-gray-700">{project.description}</p>

      <div className="border rounded-2xl p-4 bg-white">
        <RagDonut counts={counts} />
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Findings</h2>
        {flags.length === 0 ? (
          <p>No issues flagged.</p>
        ) : (
          <ul className="space-y-2">
            {flags.map((flag: any, i: number) => (
              <li key={i} className="border rounded-xl p-3 bg-white">
                <div className="text-sm"><b>Severity:</b> {flag.severity}</div>
                <div className="text-sm"><b>Reason:</b> {flag.reason}</div>
                {flag.mitigation && (
                  <div className="text-sm"><b>Mitigation:</b> {flag.mitigation}</div>
                )}
                <div className="text-xs text-gray-500 mt-1">
                  {flag.clause && policyMap[flag.clause]
                    ? <PolicyPopover {...policyMap[flag.clause]} />
                    : (flag.clause || "")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
