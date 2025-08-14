import Link from "next/link";
import { prisma } from "../../lib/prisma";
import { getSessionId } from "../../lib/session";

export default async function ProjectsPage() {
  const sessionId = await getSessionId();

  let projects = sessionId
    ? await prisma.project.findMany({
        where: { sessionId },
        orderBy: { createdAt: "desc" },
        include: { assessments: { orderBy: { createdAt: "desc" }, take: 1 } },
      })
    : [];

  // (Optional) fallback to recent projects so the page isn’t empty during dev
  if (!projects.length) {
    projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { assessments: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
  }

  const list = Array.isArray(projects) ? projects : [];

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">My assessments</h1>
      {list.length === 0 ? (
        <p className="text-gray-500">No saved assessments yet.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((p) => {
            const latest = p.assessments[0];
            const flags = (latest?.flags as any[]) ?? [];
            const red = flags.filter((f) => f.severity === "red").length;
            const amber = flags.filter((f) => f.severity === "amber").length;
            const green = flags.filter((f) => f.severity === "green").length;

            return (
              <li key={p.id} className="border rounded-xl p-4 bg-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="font-medium">{p.title}</h2>
                    <p className="text-sm text-gray-500">
                      {new Date(p.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className="mr-3">🔴 {red}</span>
                    <span className="mr-3">🟠 {amber}</span>
                    <span>🟢 {green}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <Link className="underline" href={`/projects/${p.id}`}>
                    Open
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
