"use client";
export default function ExportMenu({ projectId }:{ projectId:number }) {
  const base = `/api/export/${projectId}`;
  return (
    <div className="flex gap-2">
      <a href={`${base}?format=md`}  className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">Export Markdown</a>
      <a href={`${base}?format=pdf`} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">Export PDF</a>
    </div>
  );
}
