"use client";

import { useState } from "react";
import { PRESET_LABELS } from "@/lib/types";

/** Read-only chip strip. */
export function LabelChips({ labels }: { labels: string[] }) {
  if (!labels || labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((l) => (
        <span key={l} className="inline-flex items-center rounded-full bg-gray-100 text-gray-700 text-[10px] uppercase tracking-wide px-2 py-0.5">
          {l}
        </span>
      ))}
    </div>
  );
}

/**
 * Editable label set. Calls `onChange` with the next array on every mutation.
 * Doesn't persist itself — the parent decides what to do with the value.
 */
export function LabelEditor({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const add = (label: string) => {
    const trimmed = label.trim().toLowerCase();
    if (!trimmed) return;
    if (value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setDraft("");
  };

  const remove = (label: string) => onChange(value.filter((l) => l !== label));

  const presets = PRESET_LABELS.filter((p) => !value.includes(p));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((l) => (
          <span
            key={l}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 text-[11px] font-medium uppercase tracking-wide px-2 py-0.5"
          >
            {l}
            {!disabled && (
              <button type="button" onClick={() => remove(l)} className="text-brand-400 hover:text-brand-700">×</button>
            )}
          </span>
        ))}
      </div>

      {!disabled && (
        <>
          <div className="flex gap-2">
            <input
              className="input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  add(draft);
                }
              }}
              placeholder="Add a label and press Enter"
            />
            <button type="button" onClick={() => add(draft)} className="btn-secondary">Add</button>
          </div>

          {presets.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => add(p)}
                  className="rounded-full border border-dashed border-gray-300 text-gray-500 hover:text-gray-900 hover:border-gray-400 text-[11px] uppercase tracking-wide px-2 py-0.5"
                >
                  + {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
