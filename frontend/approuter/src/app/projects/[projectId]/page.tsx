"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";

type Flag = {
  id: string;
  clause: string;
  severity: string;
  reason: string;
  mitigation?: string;
};

type Assessment = {
  id: number;
  created_at: string;
  flags: Flag[] | string; // Can be JSON string from DB
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
    setError("");
    toast.dismiss(); // Dismiss previous toasts
    fetch(`http://localhost:8000/projects/${projectId}/assessments/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch assessments");
        return res.json();
      })
      .then((data) => {
        // Parse flags if they're stored as JSON strings in DB
        const parsed = (data as Assessment[]).map((a) => ({
          ...a,
          flags:
            typeof a.flags === "string"
              ? (JSON.parse(a.flags) as Flag[])
              : a.flags,
        }));
        setAssessments(parsed);
        if (parsed.length === 0) toast("No assessments found.", { icon: "ℹ️" });
      })
      .catch((err) => {
        setError("Failed to fetch assessments");
        toast.error("Failed to fetch assessments");
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <main className="max-w-2xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">
        Assessments for Project <span className="text-blue-600">#{projectId}</span>
      </h1>
      {loading && (
        <div className="mb-4">
          <span className="animate-pulse text-gray-400">Loading...</span>
        </div>
      )}
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {!loading && !error && assessments.length === 0 && (
        <div className="text-gray-500">No assessments found for this project.</div>
      )}

      <ul>
        {assessments.map((a) => (
          <li
            key={a.id}
            className="mb-4 p-4 rounded-xl shadow bg-white dark:bg-gray-800"
          >
            <div className="text-xs text-gray-500 mb-2">
              Assessment date: {a.created_at}
            </div>
            <div>
              <span className="font-semibold">Flags:</span>
              <ul className="mt-2">
                {(a.flags as Flag[]).length === 0 && (
                  <li className="text-gray-500">No flags found.</li>
                )}
                {(a.flags as Flag[]).map((flag, i) => (
                  <li
                    key={i}
                    className={`p-2 rounded my-1 ${
                      flag.severity === "red"
                        ? "bg-red-50 dark:bg-red-900/20"
                        : flag.severity === "amber"
                        ? "bg-yellow-50 dark:bg-yellow-900/20"
                        : "bg-green-50 dark:bg-green-900/20"
                    }`}
                  >
                    <div className="font-semibold capitalize">
                      {flag.severity}
                      <span className="font-normal"> — {flag.reason}</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Clause: {flag.clause}
                    </div>
                    {flag.mitigation && (
                      <div className="text-xs text-green-700 dark:text-green-400 mt-1">
                        Mitigation: {flag.mitigation}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
