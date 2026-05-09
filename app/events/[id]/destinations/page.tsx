"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ItemStatusBadge } from "@/components/Badges";
import { LabelChips } from "@/components/LabelChips";
import { Empty } from "@/components/ui/Empty";
import { Spinner } from "@/components/ui/Spinner";
import { VoteButton } from "@/components/VoteButton";
import { setDestinationStatus, subscribeDestinations } from "@/lib/firestore/destinations";
import { destinationPath } from "@/lib/firestore/paths";
import { formatCurrency } from "@/lib/format";
import { ITEM_STATUSES, type Destination, type ItemStatus } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useEvent } from "../event-context";

export default function DestinationsPage() {
  const { event, canWrite, isPublicViewer } = useEvent();
  const { user, profile } = useAuth();
  const [destinations, setDestinations] = useState<Destination[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<ItemStatus | "all">("all");

  useEffect(() => subscribeDestinations(event.id, setDestinations), [event.id]);

  const actor = user && profile ? { id: user.uid, name: profile.name } : null;
  const visible = (destinations ?? []).filter(
    (d) => statusFilter === "all" || d.status === statusFilter
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Destinations</h1>
          <p className="text-sm text-gray-600">Suggest, vote, shortlist, choose.</p>
        </div>
        {canWrite && (
          <Link href={`/events/${event.id}/destinations/new`} className="btn-primary">
            + Suggest
          </Link>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <FilterChip active={statusFilter === "all"} onClick={() => setStatusFilter("all")} label="All" />
        {ITEM_STATUSES.map((s) => (
          <FilterChip
            key={s.value}
            active={statusFilter === s.value}
            onClick={() => setStatusFilter(s.value)}
            label={s.label}
          />
        ))}
      </div>

      {destinations === null ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <Empty
          title={destinations.length === 0 ? "No destinations yet" : "Nothing matches"}
          body={canWrite && destinations.length === 0 ? "Suggest the first place." : undefined}
          action={canWrite && destinations.length === 0 ? (
            <Link href={`/events/${event.id}/destinations/new`} className="btn-primary">Suggest a destination</Link>
          ) : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((d, idx) => (
            <li key={d.id} className="card">
              <div className="flex items-start gap-4">
                <div className="text-2xl font-bold text-gray-300 w-8 shrink-0 text-center pt-1">
                  {idx + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    <ItemStatusBadge
                      status={d.status}
                      onChange={canWrite && actor ? (s) => setDestinationStatus({ eventId: event.id, destinationId: d.id, status: s, actor }) : undefined}
                    />
                  </div>
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
                    <span className="pill">{d.createdByName}</span>
                    {d.commentCount > 0 && <span className="pill">{d.commentCount} comments</span>}
                  </div>

                  {d.labels?.length > 0 && (
                    <div className="mt-2">
                      <LabelChips labels={d.labels} />
                    </div>
                  )}
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

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
        active ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function ratingDots(n: number): string {
  return "●".repeat(Math.max(1, Math.min(5, n))) + "○".repeat(5 - Math.max(1, Math.min(5, n)));
}
