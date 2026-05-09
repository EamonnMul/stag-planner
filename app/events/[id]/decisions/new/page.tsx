"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth";
import { addDecisionOption, createDecision } from "@/lib/firestore/decisions";
import { useEvent } from "../../event-context";

export default function NewDecisionPage() {
  const router = useRouter();
  const { event, canWrite } = useEvent();
  const { user, profile } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);

  if (!canWrite) {
    return <p className="text-sm text-gray-600">Only members can open decisions.</p>;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setBusy(true);
    try {
      const id = await createDecision({
        eventId: event.id,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: user.uid,
        createdByName: profile.name,
      });
      // Add seeded options if present.
      const cleaned = options.map((o) => o.trim()).filter(Boolean);
      for (const text of cleaned) {
        // eslint-disable-next-line no-await-in-loop
        await addDecisionOption({
          eventId: event.id,
          decisionId: id,
          text,
          description: "",
          createdBy: user.uid,
          createdByName: profile.name,
        });
      }
      router.push(`/events/${event.id}/decisions/${id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1">Open a decision</h1>
      <p className="text-sm text-gray-600 mb-6">
        Frame the question. Drop in some starting options. The group can vote, comment, and weigh in.
      </p>

      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Choose a destination"
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Context, constraints, what we need to settle."
          />
        </div>

        <div>
          <label className="label">Due date (optional)</label>
          <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div>
          <label className="label">Starting options</label>
          <div className="space-y-2">
            {options.map((o, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  className="input"
                  value={o}
                  onChange={(e) => {
                    const next = options.slice();
                    next[idx] = e.target.value;
                    setOptions(next);
                  }}
                  placeholder={`Option ${idx + 1}`}
                />
                {options.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                    className="btn-secondary px-2"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setOptions([...options, ""])}
              className="text-sm text-brand-700 hover:underline"
            >
              + Add another option
            </button>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="button" className="btn-secondary flex-1" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={busy || !title.trim()}>
            {busy ? "Opening…" : "Open decision"}
          </button>
        </div>
      </form>
    </div>
  );
}
