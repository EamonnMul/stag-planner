"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/auth";
import { createEvent } from "@/lib/firestore/events";
import type { Visibility } from "@/lib/types";

export default function NewEventPage() {
  return (
    <AuthGate>
      <Inner />
    </AuthGate>
  );
}

function Inner() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setError(null);
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate < startDate) {
      setError("End date can't be before the start date.");
      return;
    }
    setBusy(true);
    try {
      const id = await createEvent({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startDate,
        endDate,
        visibility,
        organiserId: user.uid,
        organiserName: profile.name,
        organiserEmail: profile.email,
        organiserAvatarUrl: profile.avatarUrl ?? null,
      });
      router.push(`/events/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-2xl font-bold mb-1">Create a stag</h1>
        <p className="text-sm text-gray-600 mb-6">You'll be the organiser. You can invite others next.</p>

        <form onSubmit={onSubmit} className="card space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dave's stag" />
          </div>
          <div>
            <label className="label">Default location / region</label>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Europe — destinations TBD" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start</label>
              <input type="date" className="input" required value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className="label">End</label>
              <input type="date" className="input" required value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Long weekend, mixed budget, no embarrassing T-shirts." />
          </div>

          <div>
            <label className="label">Visibility</label>
            <div className="grid grid-cols-2 gap-2">
              <Choice
                active={visibility === "private"}
                onClick={() => setVisibility("private")}
                title="Private"
                body="Only invited members can view."
              />
              <Choice
                active={visibility === "public"}
                onClick={() => setVisibility("public")}
                title="Public"
                body="Anyone with the link can view (read-only)."
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => router.back()}>Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={busy}>{busy ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </main>
    </>
  );
}

function Choice({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-3 transition ${
        active ? "bg-brand-50 border-brand-300" : "bg-white border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-gray-600">{body}</div>
    </button>
  );
}
