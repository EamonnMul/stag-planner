"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { updateEvent } from "@/lib/firestore/events";
import { useEvent, useIsOrganiser } from "../event-context";

export default function SettingsPage() {
  const { event, refresh } = useEvent();
  const { profile, refreshProfile } = useAuth();
  const isOrganiser = useIsOrganiser();
  const router = useRouter();

  const [title, setTitle] = useState(event.title);
  const [location, setLocation] = useState(event.location);
  const [description, setDescription] = useState(event.description);
  const [startDate, setStartDate] = useState(toDateInput(event.startDate.toDate()));
  const [endDate, setEndDate] = useState(toDateInput(event.endDate.toDate()));
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [name, setName] = useState(profile?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const saveEvent = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateEvent(event.id, {
        title: title.trim(),
        location: location.trim(),
        description: description.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
      await refresh();
      setSavedAt(Date.now());
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setProfileBusy(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || null,
      });
      await refreshProfile();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 1800);
    } finally {
      setProfileBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section>
        <h2 className="font-semibold mb-2">Your profile</h2>
        <form onSubmit={saveProfile} className="card space-y-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Avatar URL (optional)</label>
            <input className="input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={profileBusy}>
              {profileBusy ? "Saving…" : "Save profile"}
            </button>
            {profileSaved && <span className="text-sm text-green-700">Saved.</span>}
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Event details</h2>
        {!isOrganiser && (
          <p className="text-sm text-gray-500 mb-2">Only the organiser can edit these.</p>
        )}
        <form onSubmit={saveEvent} className="card space-y-3">
          <fieldset disabled={!isOrganiser} className="space-y-3 disabled:opacity-60">
            <div>
              <label className="label">Title</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start</label>
                <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="label">End</label>
                <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input min-h-[100px]" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="btn-primary" disabled={busy}>
                {busy ? "Saving…" : "Save event"}
              </button>
              {savedAt && <span className="text-sm text-green-700">Saved.</span>}
            </div>
          </fieldset>
        </form>
      </section>

      <section>
        <button className="btn-secondary" onClick={() => router.push("/events")}>← Back to events</button>
      </section>
    </div>
  );
}

function toDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}
