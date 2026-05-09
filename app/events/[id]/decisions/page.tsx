"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DecisionStatusBadge } from "@/components/Badges";
import { Empty } from "@/components/ui/Empty";
import { Spinner } from "@/components/ui/Spinner";
import { subscribeDecisions } from "@/lib/firestore/decisions";
import { formatDate, formatRelative } from "@/lib/format";
import type { Decision } from "@/lib/types";
import { useEvent } from "../event-context";

export default function DecisionsPage() {
  const { event, canWrite } = useEvent();
  const [decisions, setDecisions] = useState<Decision[] | null>(null);

  useEffect(() => subscribeDecisions(event.id, setDecisions), [event.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Decisions</h1>
          <p className="text-sm text-gray-600">Lock in the calls. Track the options. Move on.</p>
        </div>
        {canWrite && (
          <Link href={`/events/${event.id}/decisions/new`} className="btn-primary">+ New decision</Link>
        )}
      </div>

      {decisions === null ? (
        <Spinner />
      ) : decisions.length === 0 ? (
        <Empty
          title="No decisions yet"
          body={canWrite ? "Open the first one — destination, dates, accommodation." : "Members haven't opened any decisions yet."}
          action={canWrite ? <Link href={`/events/${event.id}/decisions/new`} className="btn-primary">Open a decision</Link> : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {decisions.map((d) => {
            const overdue = d.status === "open" && d.dueDate && d.dueDate.toDate() < new Date();
            return (
              <li key={d.id}>
                <Link href={`/events/${event.id}/decisions/${d.id}`} className="card block hover:border-brand-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{d.title}</div>
                      {d.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{d.description}</p>
                      )}
                    </div>
                    <DecisionStatusBadge status={d.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                    <span className="pill">{d.optionCount} {d.optionCount === 1 ? "option" : "options"}</span>
                    {d.commentCount > 0 && <span className="pill">{d.commentCount} comments</span>}
                    {d.dueDate && (
                      <span className={`pill ${overdue ? "bg-red-50 text-red-700" : ""}`}>
                        {overdue ? "Overdue " : "Due "}{formatDate(d.dueDate)}
                      </span>
                    )}
                    <span className="pill">Updated {formatRelative(d.updatedAt)}</span>
                  </div>

                  {d.chosenOptionText && (
                    <div className="mt-3 text-sm">
                      <span className="text-xs uppercase tracking-wide text-green-700 font-bold">Chosen:</span>{" "}
                      <span className="font-medium">{d.chosenOptionText}</span>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
