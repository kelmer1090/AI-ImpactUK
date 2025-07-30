"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Assessment = {
  id: number;
  created_at: string;
  flags: any[]; // Will be a list of flag dicts
  project_id: number;
};

export default function ProjectDetailsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetch(`http://localhost:8000/projects/${projectId}/assessments/`)
      .then((res) => res.json())
      .then(setAssessments)
      .catch(() => setError("Failed to fetch assessments"))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Assessments for Project #{projectId}</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {assessments.length === 0 && <div>No assessments found for this project.</div>}
      <ul>
        {assessments.map((a) => (
          <li key={a.id} className="mb-4 p-4 rounded-xl shadow bg-white dark:bg-gray-800">
            <div className="text-xs text-gray-500">Assessment date: {a.created_at}</div>
            <div>
              <span className="font-semibold">Flags:</span>
              <ul className="mt-2">
                {a.flags.length === 0 && <li>No flags found.</li>}
                {a.flags.map((flag, i) => (
                  <li key={i} className="p-2 rounded bg-gray-100 dark:bg-gray-900 my-1">
                    <div><span className="font-semibold">{flag.severity}</span> — {flag.reason}</div>
                    <div className="text-xs">Clause: {flag.clause}</div>
                    {flag.mitigation && (
                      <div className="text-xs text-green-700">Mitigation: {flag.mitigation}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
