"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { TopBar } from "@/components/TopBar";
import { Empty } from "@/components/ui/Empty";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import { listEventsForUser } from "@/lib/firestore/events";
import { formatDateRange } from "@/lib/format";
import type { StagEvent } from "@/lib/types";

export default function EventsPage() {
  return (
    <AuthGate>
      <Inner />
    </AuthGate>
  );
}

function Inner() {
  const { user } = useAuth();
  const [events, setEvents] = useState<StagEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    listEventsForUser(user.uid).then(setEvents).catch((e) => setError(e.message));
  }, [user]);

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Your stags</h1>
          <Link href="/events/new" className="btn-primary">+ New stag</Link>
        </div>

        {error && <div className="card mb-4 text-red-700 bg-red-50 border-red-200">{error}</div>}

        {events === null ? (
          <FullPageSpinner />
        ) : events.length === 0 ? (
          <Empty
            title="No stags yet"
            body="Create your first stag and invite the lads."
            action={<Link href="/events/new" className="btn-primary">Create a stag</Link>}
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {events
              .sort((a, b) => a.startDate.toMillis() - b.startDate.toMillis())
              .map((ev) => (
                <li key={ev.id}>
                  <Link href={`/events/${ev.id}`} className="card block hover:border-brand-300 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{ev.title}</div>
                        <div className="text-sm text-gray-600 truncate">{ev.location}</div>
                      </div>
                      {ev.organiserId === user?.uid && (
                        <span className="pill bg-brand-50 text-brand-700">Organiser</span>
                      )}
                    </div>
                    <div className="mt-3 text-sm text-gray-600">
                      {formatDateRange(ev.startDate, ev.endDate)}
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {ev.memberIds.length} {ev.memberIds.length === 1 ? "member" : "members"}
                    </div>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </main>
    </>
  );
}
