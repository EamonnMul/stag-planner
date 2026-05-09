"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { addProCon, deleteProCon, subscribeProsCons } from "@/lib/firestore/prosCons";
import type { ProConItem, ProConType } from "@/lib/types";

export function ProsConsSection({
  itemPath,
  canWrite,
}: {
  itemPath: string;
  canWrite: boolean;
}) {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<ProConItem[] | null>(null);
  const [text, setText] = useState("");
  const [type, setType] = useState<ProConType>("pro");
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeProsCons(itemPath, setItems), [itemPath]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !text.trim()) return;
    setBusy(true);
    try {
      await addProCon({ itemPath, userId: user.uid, userName: profile.name, text, type });
      setText("");
    } finally {
      setBusy(false);
    }
  };

  const pros = (items ?? []).filter((i) => i.type === "pro");
  const cons = (items ?? []).filter((i) => i.type === "con");

  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
        Pros & Cons
      </h3>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <Column
          title="Pros"
          items={pros}
          accent="text-green-700 bg-green-50 border-green-100"
          currentUserId={user?.uid}
          itemPath={itemPath}
        />
        <Column
          title="Cons"
          items={cons}
          accent="text-red-700 bg-red-50 border-red-100"
          currentUserId={user?.uid}
          itemPath={itemPath}
        />
      </div>

      {canWrite ? (
        <form onSubmit={submit} className="space-y-2 pt-3 border-t">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("pro")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition ${
                type === "pro" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >Pro</button>
            <button
              type="button"
              onClick={() => setType("con")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide transition ${
                type === "con" ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >Con</button>
          </div>
          <div className="flex gap-2">
            <input
              className="input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={type === "pro" ? "Why this is a great call…" : "What's the catch…"}
            />
            <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>
              Add
            </button>
          </div>
        </form>
      ) : (
        <p className="text-xs text-gray-400 border-t pt-3">
          {user ? "Join this stag to add pros and cons." : "Sign in to add pros and cons."}
        </p>
      )}
    </section>
  );
}

function Column({
  title,
  items,
  accent,
  currentUserId,
  itemPath,
}: {
  title: string;
  items: ProConItem[];
  accent: string;
  currentUserId?: string;
  itemPath: string;
}) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">{title}</div>
      {items.length === 0 ? (
        <div className="text-sm text-gray-400">None yet.</div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className={`rounded-lg border px-3 py-2 text-sm ${accent}`}>
              <div className="flex justify-between gap-2">
                <span>{it.text}</span>
                {currentUserId === it.userId && (
                  <button
                    onClick={() => deleteProCon(itemPath, it.id)}
                    className="text-xs text-gray-400 hover:text-red-600 shrink-0"
                  >×</button>
                )}
              </div>
              <div className="text-xs opacity-70 mt-0.5">{it.userName}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
