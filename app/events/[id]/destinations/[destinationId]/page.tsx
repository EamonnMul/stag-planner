"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CommentsSection } from "@/components/CommentsSection";
import { ProsConsSection } from "@/components/ProsConsSection";
import { VoteButton } from "@/components/VoteButton";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import { deleteDestination, subscribeDestination } from "@/lib/firestore/destinations";
import { destinationPath } from "@/lib/firestore/paths";
import { formatCurrency } from "@/lib/format";
import type { Destination } from "@/lib/types";
import { useEvent } from "../../event-context";

export default function DestinationDetailPage() {
  const params = useParams<{ destinationId: string }>();
  const router = useRouter();
  const { event, canWrite, isOrganiser } = useEvent();
  const { user } = useAuth();
  const [destination, setDestination] = useState<Destination | null | undefined>(undefined);

  useEffect(() => {
    if (!params?.destinationId) return;
    return subscribeDestination(event.id, params.destinationId, (d) => setDestination(d));
  }, [event.id, params?.destinationId]);

  if (destination === undefined) return <FullPageSpinner />;
  if (destination === null) {
    return (
      <div>
        <p className="text-sm text-gray-600">Destination not found.</p>
        <Link href={`/events/${event.id}/destinations`} className="btn-secondary mt-3 inline-flex">
          ← Back
        </Link>
      </div>
    );
  }

  const path = destinationPath(event.id, destination.id);
  const canDelete = canWrite && (user?.uid === destination.createdBy || isOrganiser);

  return (
    <div className="space-y-6">
      <Link href={`/events/${event.id}/destinations`} className="text-sm text-gray-500 hover:underline">
        ← All destinations
      </Link>

      <header className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              {[destination.city, destination.country].filter(Boolean).join(", ") || "—"}
            </div>
            <h1 className="text-2xl font-bold mt-1">{destination.name}</h1>
            <div className="text-xs text-gray-500 mt-1">Suggested by {destination.createdByName}</div>
          </div>
          <VoteButton itemPath={path} voteCount={destination.voteCount} canVote={canWrite} />
        </div>

        {destination.description && (
          <p className="text-sm text-gray-700 mt-4 whitespace-pre-wrap">{destination.description}</p>
        )}

        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Stat label="Cost p/p" value={formatCurrency(destination.estimatedCost)} />
          <Stat label="Travel" value={destination.travelNotes || "—"} />
          <Stat label="Nightlife" value={`${destination.nightlifeRating}/5`} />
          <Stat label="Activities" value={`${destination.activityRating}/5`} />
        </dl>

        {canDelete && (
          <div className="mt-4 pt-4 border-t flex justify-end">
            <button
              onClick={async () => {
                if (confirm(`Delete "${destination.name}"? This removes all votes and comments.`)) {
                  await deleteDestination(event.id, destination.id);
                  router.push(`/events/${event.id}/destinations`);
                }
              }}
              className="text-xs text-gray-400 hover:text-red-600"
            >
              Delete destination
            </button>
          </div>
        )}
      </header>

      <div className="card">
        <ProsConsSection itemPath={path} canWrite={canWrite} />
      </div>

      <div className="card">
        <CommentsSection itemPath={path} canWrite={canWrite} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
      <div className="font-medium text-gray-900 truncate">{value}</div>
    </div>
  );
}
