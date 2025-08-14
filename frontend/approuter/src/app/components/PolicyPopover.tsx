"use client";

import React, { useState } from "react";

export type PolicyDetailProps = {
  label: string;
  text?: string;
  link?: string;
  category?: string;
  document?: string;
};

export function PolicyPopover(props: PolicyDetailProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        className="underline underline-offset-2"
        onClick={() => setOpen((v) => !v)}
      >
        {props.label || "Policy"}
      </button>
      {open && (
        <div className="z-10 max-w-md rounded-xl border p-3 bg-white shadow">
          {props.text && <p className="text-sm mb-2">{props.text}</p>}
          {props.document && (
            <div className="text-xs text-gray-500">Source: {props.document}</div>
          )}
          {props.link && (
            <a
              className="text-blue-600 text-xs underline"
              href={props.link}
              target="_blank"
              rel="noreferrer"
            >
              Open reference
            </a>
          )}
        </div>
      )}
    </span>
  );
}
