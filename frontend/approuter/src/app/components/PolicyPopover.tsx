import React, { useState } from "react";

type PolicyDetailProps = {
  label: string;
  text: string;
  link: string;
  document?: string;
};

export function PolicyPopover({ label, text, link, document }: PolicyDetailProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="text-blue-600 underline underline-offset-2 hover:text-blue-800"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open && (
        <div
          className="absolute z-50 bg-white dark:bg-gray-900 border rounded-xl p-4 shadow-lg w-80 mt-2"
          style={{ left: 0 }}
        >
          <div className="font-semibold mb-2">{label}</div>
          <div className="text-sm mb-2">{text}</div>
          {document && (
            <div className="text-xs text-gray-500 mb-2">Source: {document}</div>
          )}
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline text-xs"
          >
            View policy section ↗
          </a>
          <button
            className="absolute top-2 right-3 text-gray-400 hover:text-gray-600"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>
      )}
    </span>
  );
}
