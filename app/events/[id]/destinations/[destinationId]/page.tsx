"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ItemStatusBadge } from "@/components/Badges";
import { CommentsSection } from "@/components/CommentsSection";
import { LabelChips, LabelEditor } from "@/components/LabelChips";
import { ProsConsSection } from "@/components/ProsConsSection";
import { VoteButton } from "@/components/VoteButton";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import {
  deleteDestination,
  setDestinationStatus,
  subscribeDestination,
  updateDestination,
} from "@/lib/firestore/destinations";
import { subscribeActivityForEntity } from "@/lib/firestore/activity";
import { destinationPath } from "@/lib/firestore/paths";
import { formatCurrency, formatRelative } from "@/lib/format";
import type { ActivityLogEntry, Destination, ItemStatus } from "@/lib/types";
import { useEvent } from "../../event-context";

export default function DestinationDetailPage() {
  const params = useParams<{ destinationId: string }>();
  const router = useRouter();
  const { event, canWrite, isOrganiser } = useEvent();
  const { user, profile } = useAuth();
  const [destination, setDestination] = useState<Destination | null | undefined>(undefined);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    if (!params?.destinationId) return;
    return subscribeDestination(event.id, params.destinationId, (d) => setDestination(d));
  }, [event.id, params?.destinationId]);

  useEffect(() => {
    if (!params?.destinationId) return;
    return subscribeActivityForEntity(event.id, "destination", params.destinationId, setActivity);
  }, [event.id, params?.destinationId]);

  if (destination === undefined) return <FullPageSpinner />;
  if (destination === null) {
    return (
      <div>
        <p className="text-sm text-gray-600">Destination not found.</p>
        <Link href={`/events/${event.id}/destinations`} className="btn-secondary mt-3 inline-flex">← Back</Link>
      </div>
    );
  }

  const path = destinationPath(event.id, destination.id);
  const actor = user && profile ? { id: user.uid, name: profile.name } : null;
  const canDelete = canWrite && (user?.uid === destination.createdBy || isOrganiser);

  return (
    <div className="space-y-6">
      <Link href={`/events/${event.id}/destinations`} className="text-sm text-gray-500 hover:underline">
        ← All destinations
      </Link>

      <header className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              {[destination.city, destination.country].filter(Boolean).join(", ") || "—"}
            </div>
            <h1 className="text-2xl font-bold mt-1">{destination.name}</h1>
            <div className="text-xs text-gray-500 mt-1">Suggested by {destination.createdByName}</div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <ItemStatusBadge
              status={destination.status}
              onChange={canWrite && actor ? (s: ItemStatus) => setDestinationStatus({ eventId: event.id, destinationId: destination.id, status: s, actor }) : undefined}
            />
            <VoteButton itemPath={path} voteCount={destination.voteCount} canVote={canWrite} />
          </div>
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

        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Labels</div>
          {canWrite ? (
            <LabelEditor
              value={destination.labels ?? []}
              onChange={(next) => updateDestination(event.id, destination.id, { labels: next })}
            />
          ) : (
            <LabelChips labels={destination.labels ?? []} />
          )}
        </div>

        {canDelete && (
          <div className="mt-4 pt-4 border-t flex justify-end">
            <button
              onClick={async () => {
                if (confirm(`Delete "${destination.name}"?`)) {
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

      <div className="card">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Activity</h3>
        {activity.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing yet.</p>
        ) : (
          <ul className="space-y-2">
            {activity.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 text-sm">
                <span className="text-gray-700 truncate">{a.message}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{formatRelative(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
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
