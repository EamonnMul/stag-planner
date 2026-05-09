"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { DecisionStatusBadge } from "@/components/Badges";
import { CommentsSection } from "@/components/CommentsSection";
import { ProsConsSection } from "@/components/ProsConsSection";
import { VoteButton } from "@/components/VoteButton";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import {
  addDecisionOption,
  chooseOption,
  clearChosenOption,
  deleteDecision,
  deleteDecisionOption,
  subscribeDecision,
  subscribeDecisionOptions,
  updateDecisionStatus,
} from "@/lib/firestore/decisions";
import { decisionOptionPath, decisionPath } from "@/lib/firestore/paths";
import { formatDate, formatRelative } from "@/lib/format";
import type { Decision, DecisionOption, DecisionStatus } from "@/lib/types";
import { useEvent } from "../../event-context";

export default function DecisionDetailPage() {
  const params = useParams<{ decisionId: string }>();
  const router = useRouter();
  const { event, canWrite, isOrganiser } = useEvent();
  const { user, profile } = useAuth();

  const [decision, setDecision] = useState<Decision | null | undefined>(undefined);
  const [options, setOptions] = useState<DecisionOption[] | null>(null);

  useEffect(() => {
    if (!params?.decisionId) return;
    return subscribeDecision(event.id, params.decisionId, setDecision);
  }, [event.id, params?.decisionId]);

  useEffect(() => {
    if (!params?.decisionId) return;
    return subscribeDecisionOptions(event.id, params.decisionId, setOptions);
  }, [event.id, params?.decisionId]);

  if (decision === undefined) return <FullPageSpinner />;
  if (decision === null) {
    return (
      <div>
        <p className="text-sm text-gray-600">Decision not found.</p>
        <Link href={`/events/${event.id}/decisions`} className="btn-secondary mt-3 inline-flex">← Back</Link>
      </div>
    );
  }

  const actor = user && profile ? { id: user.uid, name: profile.name } : null;
  const canDelete = canWrite && (isOrganiser || user?.uid === decision.createdBy);
  const overdue = decision.status === "open" && decision.dueDate && decision.dueDate.toDate() < new Date();
  const decisionPathStr = decisionPath(event.id, decision.id);

  return (
    <div className="space-y-6">
      <Link href={`/events/${event.id}/decisions`} className="text-sm text-gray-500 hover:underline">
        ← All decisions
      </Link>

      <header className="card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{decision.title}</h1>
            <div className="text-xs text-gray-500 mt-1">
              Opened by {decision.createdByName} · {formatRelative(decision.createdAt)}
              {decision.dueDate && ` · Due ${formatDate(decision.dueDate)}`}
            </div>
          </div>
          <DecisionStatusBadge
            status={decision.status}
            onChange={canWrite && actor ? (s) => updateDecisionStatus({ eventId: event.id, decisionId: decision.id, status: s, actor }) : undefined}
          />
        </div>

        {decision.description && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap mt-4">{decision.description}</p>
        )}

        {overdue && (
          <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            This decision is past its due date.
          </div>
        )}

        {decision.chosenOptionText && (
          <div className="mt-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-green-700 font-bold">Chosen</div>
            <div className="font-semibold text-green-900 mt-0.5">{decision.chosenOptionText}</div>
            {isOrganiser && actor && (
              <button
                onClick={() => clearChosenOption({ eventId: event.id, decisionId: decision.id, actor })}
                className="mt-2 text-xs text-green-700 hover:underline"
              >
                Reopen / clear choice
              </button>
            )}
          </div>
        )}

        {canDelete && (
          <div className="mt-5 pt-4 border-t flex justify-end">
            <button
              onClick={async () => {
                if (confirm(`Delete "${decision.title}"?`)) {
                  await deleteDecision(event.id, decision.id);
                  router.push(`/events/${event.id}/decisions`);
                }
              }}
              className="text-xs text-gray-400 hover:text-red-600"
            >
              Delete decision
            </button>
          </div>
        )}
      </header>

      <section className="card">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
          Options {options ? `(${options.length})` : ""}
        </h3>

        {options === null ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-gray-400">No options yet.</p>
        ) : (
          <ul className="space-y-3">
            {options.map((o, idx) => {
              const optionPathStr = decisionOptionPath(event.id, decision.id, o.id);
              const isChosen = decision.chosenOptionId === o.id;
              return (
                <li key={o.id} className={`rounded-xl border p-3 ${isChosen ? "bg-green-50 border-green-300" : "bg-white border-gray-200"}`}>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl font-bold text-gray-300 w-7 text-center">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{o.text}</div>
                      {o.description && <p className="text-sm text-gray-700 mt-1">{o.description}</p>}
                      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">
                        Suggested by {o.createdByName}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <VoteButton
                        itemPath={optionPathStr}
                        voteCount={o.voteCount}
                        canVote={canWrite}
                        size="sm"
                      />
                      {isOrganiser && actor && !isChosen && decision.status !== "closed" && (
                        <button
                          onClick={() => chooseOption({ eventId: event.id, decisionId: decision.id, optionId: o.id, optionText: o.text, actor })}
                          className="text-xs text-green-700 hover:underline"
                        >
                          Mark chosen
                        </button>
                      )}
                      {canWrite && (user?.uid === o.createdBy || isOrganiser) && !isChosen && (
                        <button
                          onClick={async () => {
                            if (confirm(`Remove option "${o.text}"?`)) {
                              await deleteDecisionOption({ eventId: event.id, decisionId: decision.id, optionId: o.id });
                            }
                          }}
                          className="text-xs text-gray-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                    <ProsConsSection itemPath={optionPathStr} canWrite={canWrite} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {canWrite && actor && decision.status !== "closed" && (
          <AddOptionForm eventId={event.id} decisionId={decision.id} actor={actor} />
        )}
      </section>

      <div className="card">
        <CommentsSection itemPath={decisionPathStr} canWrite={canWrite} />
      </div>
    </div>
  );
}

function AddOptionForm({
  eventId,
  decisionId,
  actor,
}: {
  eventId: string;
  decisionId: string;
  actor: { id: string; name: string };
}) {
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await addDecisionOption({
        eventId,
        decisionId,
        text,
        description,
        createdBy: actor.id,
        createdByName: actor.name,
      });
      setText("");
      setDescription("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 pt-4 border-t space-y-2">
      <div className="text-xs uppercase tracking-wide text-gray-400">Add option</div>
      <input
        className="input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Option title (e.g. Lisbon, Krakow…)"
      />
      <input
        className="input"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Optional one-liner of context"
      />
      <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>
        {busy ? "Adding…" : "Add option"}
      </button>
    </form>
  );
}
