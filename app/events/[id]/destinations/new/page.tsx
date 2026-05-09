"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LabelEditor } from "@/components/LabelChips";
import { useAuth } from "@/lib/auth";
import { createDestination } from "@/lib/firestore/destinations";
import { useEvent } from "../../event-context";

export default function NewDestinationPage() {
  const router = useRouter();
  const { event, canWrite } = useEvent();
  const { user, profile } = useAuth();

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [travelNotes, setTravelNotes] = useState("");
  const [nightlife, setNightlife] = useState(3);
  const [activity, setActivity] = useState(3);
  const [labels, setLabels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canWrite) {
    return <p className="text-sm text-gray-600">Only members can suggest destinations.</p>;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setError(null);
    setBusy(true);
    try {
      const id = await createDestination({
        eventId: event.id,
        name,
        country,
        city,
        description,
        estimatedCost: Number(cost) || 0,
        travelNotes,
        nightlifeRating: nightlife,
        activityRating: activity,
        labels,
        createdBy: user.uid,
        createdByName: profile.name,
      });
      router.push(`/events/${event.id}/destinations/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1">Suggest a destination</h1>
      <p className="text-sm text-gray-600 mb-6">
        Pitch the where. Group can pile in with pros, cons, and votes.
      </p>

      <form onSubmit={submit} className="card space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Lisbon weekender" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">City</label>
            <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lisbon" />
          </div>
          <div>
            <label className="label">Country</label>
            <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Portugal" />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sun, seafood, sensible night culture." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Estimated cost p/p</label>
            <input type="number" min="0" className="input" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="350" />
          </div>
          <div>
            <label className="label">Travel notes</label>
            <input className="input" value={travelNotes} onChange={(e) => setTravelNotes(e.target.value)} placeholder="2hr flight, easy airport" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <RatingPicker label="Nightlife rating" value={nightlife} onChange={setNightlife} />
          <RatingPicker label="Activity rating" value={activity} onChange={setActivity} />
        </div>
        <div>
          <label className="label">Labels</label>
          <LabelEditor value={labels} onChange={setLabels} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button type="button" className="btn-secondary flex-1" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={busy || !name.trim()}>
            {busy ? "Saving…" : "Suggest destination"}
          </button>
        </div>
      </form>
    </div>
  );
}

function RatingPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 h-10 rounded-lg border text-sm font-semibold transition ${
              n <= value
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-gray-500 border-gray-200 hover:border-brand-300"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
