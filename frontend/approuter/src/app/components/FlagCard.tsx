"use client";

import { PolicyPopover } from "./PolicyPopover";
import type { Flag } from "@/app/utils/scoring";

export default function FlagCard({
  flag,
  clauseLookup,
}: {
  flag: Flag;
  clauseLookup?: (id?: string) => {
    label: string;
    text?: string;
    link?: string;
    category?: string;
    document?: string;
  } | null;
}) {
  const clause = clauseLookup?.(flag.clause) || null;

  const sevClass =
    flag.severity === "red"
      ? "bg-red-100 text-red-700"
      : flag.severity === "amber"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-green-100 text-green-700";

  return (
    <div className="rounded-2xl border p-4 bg-white">
      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 rounded-md text-xs font-semibold ${sevClass}`}>
          {flag.severity.toUpperCase()}
        </span>
        {flag.meta?.phase && (
          <span className="text-xs text-gray-500 capitalize">{flag.meta.phase} phase</span>
        )}
      </div>

      <p className="mt-3 text-sm">{flag.reason}</p>

      {flag.mitigation && (
        <div className="mt-3 text-sm rounded-md bg-yellow-50 p-3">
          <span className="font-medium">Mitigation: </span>
          {flag.mitigation}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-600 flex items-center gap-2">
        {clause ? (
          <PolicyPopover
            label={clause.label}
            text={clause.text}
            link={clause.link}
            category={clause.category}
            document={clause.document}
          />
        ) : flag.clause ? (
          <span className="underline underline-offset-2">{flag.clause}</span>
        ) : null}
      </div>
    </div>
  );
}
