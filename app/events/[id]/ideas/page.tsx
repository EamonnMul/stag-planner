"use client";

import { FormEvent, useEffect, useState } from "react";
import { ItemStatusBadge, WorkstreamBadge } from "@/components/Badges";
import { CommentsSection } from "@/components/CommentsSection";
import { LabelChips, LabelEditor } from "@/components/LabelChips";
import { ProsConsSection } from "@/components/ProsConsSection";
import { VoteButton } from "@/components/VoteButton";
import { Empty } from "@/components/ui/Empty";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import { createIdea, deleteIdea, setIdeaStatus, subscribeIdeas } from "@/lib/firestore/ideas";
import { ideaPath } from "@/lib/firestore/paths";
import { formatCurrency } from "@/lib/format";
import {
  ITEM_STATUSES,
  WORKSTREAMS,
  type Idea,
  type ItemStatus,
  type Workstream,
} from "@/lib/types";
import { useEvent } from "../event-context";

export default function IdeasPage() {
  const { event, canWrite, isOrganiser } = useEvent();
  const { user, profile } = useAuth();
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [workstream, setWorkstream] = useState<Workstream | "all">("all");
  const [status, setStatus] = useState<ItemStatus | "all">("all");
  const [showNew, setShowNew] = useState(false);
  const [openIdea, setOpenIdea] = useState<Idea | null>(null);

  useEffect(() => subscribeIdeas(event.id, setIdeas), [event.id]);

  const visible = (ideas ?? []).filter((i) => {
    if (workstream !== "all" && i.workstream !== workstream) return false;
    if (status !== "all" && i.status !== status) return false;
    return true;
  });

  const actor = user && profile ? { id: user.uid, name: profile.name } : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Ideas</h1>
          <p className="text-sm text-gray-600">
            Anything not big enough to be its own destination.
          </p>
        </div>
        {canWrite && (
          <button className="btn-primary" onClick={() => setShowNew(true)}>+ Pitch</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select className="input" value={workstream} onChange={(e) => setWorkstream(e.target.value as typeof workstream)}>
          <option value="all">All workstreams</option>
          {WORKSTREAMS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">All statuses</option>
          {ITEM_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {ideas === null ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <Empty
          title={ideas.length === 0 ? "No ideas yet" : "Nothing matches"}
          body={canWrite && ideas.length === 0 ? "Pitch the first one." : undefined}
          action={canWrite && ideas.length === 0 ? <button className="btn-primary" onClick={() => setShowNew(true)}>Pitch an idea</button> : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((idea) => (
            <li key={idea.id} className="card">
              <div className="flex gap-3 items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    <ItemStatusBadge
                      status={idea.status}
                      onChange={canWrite && actor ? (s) => setIdeaStatus({ eventId: event.id, ideaId: idea.id, status: s, actor }) : undefined}
                    />
                    <WorkstreamBadge workstream={idea.workstream} />
                  </div>
                  <button onClick={() => setOpenIdea(idea)} className="text-left min-w-0">
                    <div className="font-semibold">{idea.title}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">
                      {formatCurrency(idea.estimatedCost)} · {idea.createdByName}
                      {idea.commentCount > 0 && ` · ${idea.commentCount} comments`}
                    </div>
                  </button>
                  {idea.description && (
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{idea.description}</p>
                  )}
                  {idea.labels?.length > 0 && (
                    <div className="mt-2">
                      <LabelChips labels={idea.labels} />
                    </div>
                  )}
                  <button onClick={() => setOpenIdea(idea)} className="text-sm text-brand-700 hover:underline mt-2">
                    Open →
                  </button>
                </div>
                <VoteButton
                  itemPath={ideaPath(event.id, idea.id)}
                  voteCount={idea.voteCount}
                  canVote={canWrite}
                  size="sm"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {showNew && <NewIdeaModal onClose={() => setShowNew(false)} />}

      {openIdea && (
        <IdeaDetailModal
          idea={openIdea}
          canWrite={canWrite}
          canDelete={user?.uid === openIdea.createdBy || isOrganiser}
          onClose={() => setOpenIdea(null)}
          onDelete={async () => {
            await deleteIdea(event.id, openIdea.id);
            setOpenIdea(null);
          }}
          onStatusChange={
            canWrite && actor
              ? (s) => setIdeaStatus({ eventId: event.id, ideaId: openIdea.id, status: s, actor })
              : undefined
          }
        />
      )}
    </div>
  );
}

function NewIdeaModal({ onClose }: { onClose: () => void }) {
  const { event } = useEvent();
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workstream, setWorkstream] = useState<Workstream>("activities");
  const [cost, setCost] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setBusy(true);
    try {
      await createIdea({
        eventId: event.id,
        title,
        description,
        workstream,
        estimatedCost: Number(cost) || 0,
        labels,
        createdBy: user.uid,
        createdByName: profile.name,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Pitch an idea">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Title</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Boat party" />
        </div>
        <div>
          <label className="label">Workstream</label>
          <select className="input" value={workstream} onChange={(e) => setWorkstream(e.target.value as Workstream)}>
            {WORKSTREAMS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Estimated cost p/p</label>
          <input type="number" min="0" className="input" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="50" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[100px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Pitch it to the group." />
        </div>
        <div>
          <label className="label">Labels</label>
          <LabelEditor value={labels} onChange={setLabels} />
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={busy || !title.trim()}>
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function IdeaDetailModal({
  idea,
  canWrite,
  canDelete,
  onClose,
  onDelete,
  onStatusChange,
}: {
  idea: Idea;
  canWrite: boolean;
  canDelete: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onStatusChange?: (status: ItemStatus) => void;
}) {
  const { event } = useEvent();
  const path = ideaPath(event.id, idea.id);

  return (
    <Modal open onClose={onClose} title={idea.title}>
      <div className="flex flex-wrap gap-2 mb-3">
        <ItemStatusBadge status={idea.status} onChange={onStatusChange} />
        <WorkstreamBadge workstream={idea.workstream} />
      </div>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">
        {formatCurrency(idea.estimatedCost)} · by {idea.createdByName}
      </div>

      {idea.description && (
        <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{idea.description}</p>
      )}

      {idea.labels?.length > 0 && (
        <div className="mb-4">
          <LabelChips labels={idea.labels} />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b">
        <VoteButton itemPath={path} voteCount={idea.voteCount} canVote={canWrite} />
        {canDelete && (
          <button
            onClick={async () => {
              if (confirm(`Delete "${idea.title}"?`)) await onDelete();
            }}
            className="text-xs text-gray-400 hover:text-red-600"
          >
            Delete idea
          </button>
        )}
      </div>

      <div className="mb-5">
        <ProsConsSection itemPath={path} canWrite={canWrite} />
      </div>

      <CommentsSection itemPath={path} canWrite={canWrite} />
    </Modal>
  );
}
