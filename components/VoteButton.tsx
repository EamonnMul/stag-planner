"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { subscribeUserVote, toggleVote } from "@/lib/firestore/votes";

/**
 * Self-contained vote button. Reads `voteCount` from the parent item
 * (passed in by the caller, since it lives on the item doc), and
 * subscribes to the current user's vote doc for live "have I voted" state.
 *
 * `canVote` controls writes; readers without write access (public viewers,
 * non-members) see the count but the button is disabled.
 */
export function VoteButton({
  itemPath,
  voteCount,
  canVote,
  onRequireAuth,
  size = "md",
}: {
  itemPath: string;
  voteCount: number;
  canVote: boolean;
  onRequireAuth?: () => void;
  size?: "sm" | "md";
}) {
  const { user, profile } = useAuth();
  const [voted, setVoted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setVoted(false);
      return;
    }
    return subscribeUserVote(itemPath, user.uid, setVoted);
  }, [itemPath, user?.uid]);

  const onClick = async () => {
    if (!canVote || !user || !profile) {
      onRequireAuth?.();
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await toggleVote({ itemPath, userId: user.uid, userName: profile.name });
    } catch (err) {
      console.error("vote failed", err);
    } finally {
      setBusy(false);
    }
  };

  const dims = size === "sm" ? "h-9 px-3 text-sm" : "h-11 px-4 text-base";
  return (
    <button
      onClick={onClick}
      disabled={busy}
      aria-pressed={voted}
      className={`${dims} inline-flex items-center gap-2 rounded-full border-2 font-semibold transition disabled:opacity-50 ${
        voted
          ? "bg-brand-600 text-white border-brand-600 hover:bg-brand-700"
          : "bg-white text-gray-700 border-gray-200 hover:border-brand-300"
      }`}
      title={!canVote ? "Sign in as a member to vote" : voted ? "Remove your vote" : "Vote"}
    >
      <span className="text-xs">{voted ? "✓" : "▲"}</span>
      <span>{voteCount}</span>
      <span className="hidden sm:inline">{voted ? "Voted" : "Vote"}</span>
    </button>
  );
}
