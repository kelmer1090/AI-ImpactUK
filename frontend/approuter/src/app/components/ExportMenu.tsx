"use client";
import { track } from "@/app/utils/telemetry";

export default function ExportMenu({ projectId }: { projectId: number }) {
  const base = `/api/export/${projectId}`;
  return (
    <div className="flex gap-2">
      <a
        href={`${base}?format=md`}
        onClick={() => track("export_click", { projectId, format: "md" })}
        className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
      >
        Export Markdown
      </a>
      <a
        href={`${base}?format=pdf`}
        onClick={() => track("export_click", { projectId, format: "pdf" })}
        className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
      >
        Export PDF
      </a>
    </div>
  );
}
