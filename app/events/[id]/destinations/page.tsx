"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Empty } from "@/components/ui/Empty";
import { Spinner } from "@/components/ui/Spinner";
import { VoteButton } from "@/components/VoteButton";
import { subscribeDestinations } from "@/lib/firestore/destinations";
import { destinationPath } from "@/lib/firestore/paths";
import { formatCurrency } from "@/lib/format";
import type { Destination } from "@/lib/types";
import { useEvent } from "../event-context";

export default function DestinationsPage() {
  const { event, canWrite, isPublicViewer } = useEvent();
  const [destinations, setDestinations] = useState<Destination[] | null>(null);

  useEffect(() => subscribeDestinations(event.id, setDestinations), [event.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Destinations</h1>
          <p className="text-sm text-gray-600">Suggest, vote, and weigh up the options.</p>
        </div>
        {canWrite && (
          <Link href={`/events/${event.id}/destinations/new`} className="btn-primary">
            + Suggest
          </Link>
        )}
      </div>

      {destinations === null ? (
        <Spinner />
      ) : destinations.length === 0 ? (
        <Empty
          title="No destinations yet"
          body={canWrite ? "Suggest the first place." : "Members haven't suggested anywhere yet."}
          action={
            canWrite ? (
              <Link href={`/events/${event.id}/destinations/new`} className="btn-primary">
                Suggest a destination
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {destinations.map((d, idx) => (
            <li key={d.id} className="card">
              <div className="flex items-start gap-4">
                <div className="text-2xl font-bold text-gray-300 w-8 shrink-0 text-center pt-1">
                  {idx + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/events/${event.id}/destinations/${d.id}`}
                    className="block hover:underline"
                  >
                    <div className="font-semibold text-lg">{d.name}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      {[d.city, d.country].filter(Boolean).join(", ") || "—"}
                    </div>
                  </Link>
                  {d.description && (
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{d.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="pill">{formatCurrency(d.estimatedCost)}</span>
                    <span className="pill">Nightlife {ratingDots(d.nightlifeRating)}</span>
                    <span className="pill">Activities {ratingDots(d.activityRating)}</span>
                    <span className="pill">By {d.createdByName}</span>
                  </div>
                </div>

                <div className="shrink-0">
                  <VoteButton
                    itemPath={destinationPath(event.id, d.id)}
                    voteCount={d.voteCount}
                    canVote={canWrite}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {isPublicViewer && destinations && destinations.length > 0 && (
        <p className="text-xs text-gray-400 text-center pt-2">
          Read-only view. Join to add a destination or vote.
        </p>
      )}
    </div>
  );
}

function ratingDots(n: number): string {
  return "●".repeat(Math.max(1, Math.min(5, n))) + "○".repeat(5 - Math.max(1, Math.min(5, n)));
}
