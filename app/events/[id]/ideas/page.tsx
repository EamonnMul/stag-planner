"use client";

import { FormEvent, useEffect, useState } from "react";
import { Empty } from "@/components/ui/Empty";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import {
  addComment,
  castVote,
  createIdea,
  deleteIdea,
  listComments,
  listIdeas,
  listVotesForUser,
} from "@/lib/firestore/ideas";
import { formatCurrency, formatRelative } from "@/lib/format";
import {
  IDEA_CATEGORIES,
  type Comment,
  type Idea,
  type IdeaCategory,
} from "@/lib/types";
import { useEvent } from "../event-context";

export default function IdeasPage() {
  const { event } = useEvent();
  const { user, profile } = useAuth();
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [myVotes, setMyVotes] = useState<Record<string, 1 | -1>>({});
  const [filter, setFilter] = useState<IdeaCategory | "all">("all");
  const [showNew, setShowNew] = useState(false);
  const [openIdea, setOpenIdea] = useState<Idea | null>(null);

  const refresh = async () => {
    if (!user) return;
    const [list, votes] = await Promise.all([
      listIdeas(event.id),
      listVotesForUser(event.id, user.uid),
    ]);
    setIdeas(list);
    setMyVotes(votes);
  };

  useEffect(() => {
    refresh();
  }, [event.id, user?.uid]);

  const visible = (ideas ?? []).filter((i) => filter === "all" || i.category === filter);

  const handleVote = async (idea: Idea, value: 1 | -1) => {
    if (!user || !profile) return;
    setMyVotes((m) => ({ ...m, [idea.id]: value }));
    setIdeas((arr) =>
      (arr ?? []).map((i) => {
        if (i.id !== idea.id) return i;
        const prev = myVotes[idea.id] ?? 0;
        let up = i.upvotes;
        let down = i.downvotes;
        if (prev === 1) up--;
        if (prev === -1) down--;
        if (value === 1) up++;
        if (value === -1) down++;
        return { ...i, upvotes: up, downvotes: down, score: up - down };
      })
    );
    try {
      await castVote({
        ideaId: idea.id,
        eventId: event.id,
        userId: user.uid,
        userName: profile.name,
        value,
      });
    } catch {
      refresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Ideas</h1>
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ Pitch idea</button>
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
          body="Pitch the first one to get the ball rolling."
          action={<button className="btn-primary" onClick={() => setShowNew(true)}>Pitch an idea</button>}
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              myVote={myVotes[idea.id] ?? 0}
              onVote={handleVote}
              onOpen={() => setOpenIdea(idea)}
              onDelete={
                user?.uid === idea.createdBy || user?.uid === event.organiserId
                  ? async () => {
                      await deleteIdea(idea.id);
                      refresh();
                    }
                  : undefined
              }
            />
          ))}
        </ul>
      )}

      <NewIdeaModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={async () => {
          setShowNew(false);
          await refresh();
        }}
      />

      {openIdea && (
        <IdeaDetailModal
          idea={openIdea}
          onClose={() => setOpenIdea(null)}
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

function IdeaCard({
  idea,
  myVote,
  onVote,
  onOpen,
  onDelete,
}: {
  idea: Idea;
  myVote: 1 | -1 | 0;
  onVote: (idea: Idea, value: 1 | -1) => void;
  onOpen: () => void;
  onDelete?: () => Promise<void>;
}) {
  const cat = IDEA_CATEGORIES.find((c) => c.value === idea.category);
  return (
    <li className="card">
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1 w-10 shrink-0">
          <button
            onClick={() => onVote(idea, 1)}
            className={`w-10 h-10 rounded-full text-base font-bold flex items-center justify-center transition ${
              myVote === 1 ? "bg-green-100 text-green-700" : "bg-gray-50 hover:bg-gray-100 text-gray-500"
            }`}
            aria-label="Upvote"
          >▲</button>
          <div className="text-sm font-semibold">{idea.score >= 0 ? `+${idea.score}` : idea.score}</div>
          <button
            onClick={() => onVote(idea, -1)}
            className={`w-10 h-10 rounded-full text-base font-bold flex items-center justify-center transition ${
              myVote === -1 ? "bg-red-100 text-red-700" : "bg-gray-50 hover:bg-gray-100 text-gray-500"
            }`}
            aria-label="Downvote"
          >▼</button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <button onClick={onOpen} className="text-left min-w-0">
              <div className="font-semibold truncate">{idea.title}</div>
              <div className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">
                {cat?.label} · {formatCurrency(idea.estimatedCost)} · {idea.createdByName}
              </div>
            </button>
            {onDelete && (
              <button onClick={onDelete} className="text-xs text-gray-400 hover:text-red-600">
                Delete
              </button>
            )}
          </div>
          {idea.description && (
            <p className="text-sm text-gray-700 mt-2 line-clamp-3">{idea.description}</p>
          )}
          <button onClick={onOpen} className="text-sm text-brand-700 hover:underline mt-2">
            View comments →
          </button>
        </div>
      </div>
    </li>
  );
}

function NewIdeaModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { event } = useEvent();
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<IdeaCategory>("activities");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTitle(""); setDescription(""); setCategory("activities"); setCost("");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setBusy(true);
    try {
      await createIdea({
        eventId: event.id,
        title: title.trim(),
        description: description.trim(),
        category,
        estimatedCost: Number(cost) || 0,
        createdBy: user.uid,
        createdByName: profile.name,
      });
      reset();
      await onCreated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Pitch an idea">
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="label">Title</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Boat party" />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as IdeaCategory)}>
            {IDEA_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Estimated cost per person</label>
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

function IdeaDetailModal({ idea, onClose }: { idea: Idea; onClose: () => void }) {
  const { user, profile } = useAuth();
  const { event } = useEvent();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => setComments(await listComments(idea.id));

  useEffect(() => { refresh(); }, [idea.id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !text.trim()) return;
    setBusy(true);
    try {
      await addComment({
        eventId: event.id,
        ideaId: idea.id,
        userId: user.uid,
        userName: profile.name,
        text: text.trim(),
      });
      setText("");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const cat = IDEA_CATEGORIES.find((c) => c.value === idea.category);
  return (
    <Modal open onClose={onClose} title={idea.title}>
      <div className="text-xs text-gray-500 mb-3 uppercase tracking-wide">
        {cat?.label} · {formatCurrency(idea.estimatedCost)} · {idea.createdByName}
      </div>
      {idea.description && <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{idea.description}</p>}

      <h3 className="font-semibold text-sm mb-2">Comments</h3>
      {comments === null ? (
        <Spinner />
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500">No comments yet.</p>
      ) : (
        <ul className="space-y-3 mb-4">
          {comments.map((c) => (
            <li key={c.id} className="text-sm">
              <div className="font-medium">{c.userName} <span className="text-xs text-gray-400 font-normal ml-1">{formatRelative(c.createdAt)}</span></div>
              <div className="text-gray-700 whitespace-pre-wrap">{c.text}</div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex gap-2 pt-2 border-t">
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
        />
        <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>Post</button>
      </form>
    </Modal>
  );
}
