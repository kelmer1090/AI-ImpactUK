"use client";
import { useEffect, useState } from "react";

type Project = {
  id: number;
  title: string;
  description: string;
  data_types: string;
  model_type: string;
  created_at: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("http://localhost:8000/projects/")
      .then((res) => res.json())
      .then(setProjects)
      .catch(() => setError("Failed to fetch projects"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Project History</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <ul>
        {projects.map((p) => (
          <li
            key={p.id}
            className="mb-4 p-4 rounded-xl shadow bg-white dark:bg-gray-800"
          >
            <div className="font-semibold">{p.title}</div>
            <div className="text-gray-500 text-sm">{p.created_at}</div>
            <div className="mt-2">{p.description}</div>
            {/* View details button for next step */}
            <button
              className="mt-2 px-4 py-1 bg-blue-500 text-white rounded"
              onClick={() => window.location.href = `/projects/${p.id}`}
            >
              View Details
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
