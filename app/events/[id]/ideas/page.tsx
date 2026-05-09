"use client";

import { FormEvent, useEffect, useState } from "react";
import { CommentsSection } from "@/components/CommentsSection";
import { ProsConsSection } from "@/components/ProsConsSection";
import { VoteButton } from "@/components/VoteButton";
import { Empty } from "@/components/ui/Empty";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import { createIdea, deleteIdea, subscribeIdeas } from "@/lib/firestore/ideas";
import { ideaPath } from "@/lib/firestore/paths";
import { formatCurrency } from "@/lib/format";
import { IDEA_CATEGORIES, type Idea, type IdeaCategory } from "@/lib/types";
import { useEvent } from "../event-context";

export default function IdeasPage() {
  const { event, canWrite, isOrganiser } = useEvent();
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [filter, setFilter] = useState<IdeaCategory | "all">("all");
  const [showNew, setShowNew] = useState(false);
  const [openIdea, setOpenIdea] = useState<Idea | null>(null);

  useEffect(() => subscribeIdeas(event.id, setIdeas), [event.id]);

  const visible = (ideas ?? []).filter((i) => filter === "all" || i.category === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Ideas</h1>
          <p className="text-sm text-gray-600">
            Activities, places, plans — anything that's not a destination.
          </p>
        </div>
        {canWrite && (
          <button className="btn-primary" onClick={() => setShowNew(true)}>+ Pitch</button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" />
        {IDEA_CATEGORIES.map((c) => (
          <FilterChip
            key={c.value}
            active={filter === c.value}
            onClick={() => setFilter(c.value)}
            label={c.label}
          />
        ))}
      </div>

      {ideas === null ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <Empty
          title="No ideas yet"
          body={canWrite ? "Pitch the first one." : "Members haven't pitched any ideas yet."}
          action={canWrite ? <button className="btn-primary" onClick={() => setShowNew(true)}>Pitch an idea</button> : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((idea) => (
            <li key={idea.id} className="card">
              <div className="flex gap-3 items-start">
                <div className="min-w-0 flex-1">
                  <button onClick={() => setOpenIdea(idea)} className="text-left min-w-0">
                    <div className="font-semibold">{idea.title}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">
                      {labelFor(idea.category)} · {formatCurrency(idea.estimatedCost)} · {idea.createdByName}
                    </div>
                  </button>
                  {idea.description && (
                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">{idea.description}</p>
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

      {showNew && (
        <NewIdeaModal
          onClose={() => setShowNew(false)}
        />
      )}

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
        />
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? "bg-brand-600 text-white border-brand-600"
          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

function NewIdeaModal({ onClose }: { onClose: () => void }) {
  const { event } = useEvent();
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<IdeaCategory>("activities");
  const [cost, setCost] = useState("");
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
        category,
        estimatedCost: Number(cost) || 0,
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
          <label className="label">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as IdeaCategory)}>
            {IDEA_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
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
}: {
  idea: Idea;
  canWrite: boolean;
  canDelete: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  const { event } = useEvent();
  const path = ideaPath(event.id, idea.id);

  return (
    <Modal open onClose={onClose} title={idea.title}>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">
        {labelFor(idea.category)} · {formatCurrency(idea.estimatedCost)} · {idea.createdByName}
      </div>

      {idea.description && (
        <p className="text-sm text-gray-700 whitespace-pre-wrap mb-5">{idea.description}</p>
      )}

      <div className="flex items-center justify-between gap-3 pb-5 mb-5 border-b">
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

function labelFor(c: IdeaCategory): string {
  return IDEA_CATEGORIES.find((x) => x.value === c)?.label ?? c;
}
