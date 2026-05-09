"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  addSubtask,
  deleteSubtask,
  subscribeSubtasks,
  toggleSubtask,
} from "@/lib/firestore/subtasks";
import type { Subtask } from "@/lib/types";

export function Subtasks({
  eventId,
  taskId,
  canWrite,
}: {
  eventId: string;
  taskId: string;
  canWrite: boolean;
}) {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<Subtask[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeSubtasks(eventId, taskId, setItems), [eventId, taskId]);

  const onAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !text.trim()) return;
    setBusy(true);
    try {
      await addSubtask({ eventId, taskId, text, userId: user.uid, userName: profile.name });
      setText("");
    } finally {
      setBusy(false);
    }
  };

  const total = (items ?? []).length;
  const done = (items ?? []).filter((i) => i.completed).length;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
          Subtasks {total > 0 && <span className="text-gray-400">({done}/{total})</span>}
        </h3>
      </div>

      {items === null ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">No subtasks yet.</p>
      ) : (
        <ul className="space-y-1.5 mb-3">
          {items.map((s) => (
            <li key={s.id} className="flex items-start gap-2 text-sm">
              <button
                onClick={async () => {
                  if (!canWrite || !user || !profile) return;
                  await toggleSubtask({
                    eventId, taskId, subtaskId: s.id, userId: user.uid, userName: profile.name,
                  });
                }}
                disabled={!canWrite}
                className={`mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center text-[10px] disabled:cursor-not-allowed ${
                  s.completed
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-gray-300 hover:border-brand-400 text-transparent"
                }`}
              >
                ✓
              </button>
              <span className={`flex-1 ${s.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
                {s.text}
              </span>
              {canWrite && user?.uid === s.createdBy && (
                <button
                  onClick={() => deleteSubtask({ eventId, taskId, subtaskId: s.id })}
                  className="text-xs text-gray-300 hover:text-red-500"
                >×</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <form onSubmit={onAdd} className="flex gap-2 pt-2 border-t">
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a subtask…"
          />
          <button type="submit" className="btn-secondary" disabled={busy || !text.trim()}>Add</button>
        </form>
      ) : (
        <p className="text-xs text-gray-400 border-t pt-3">
          {user ? "Join this stag to add subtasks." : "Sign in to add subtasks."}
        </p>
      )}
    </section>
  );
}
