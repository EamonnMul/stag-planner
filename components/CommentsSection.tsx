"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { addComment, deleteComment, subscribeComments } from "@/lib/firestore/comments";
import { formatRelative } from "@/lib/format";
import type { Comment } from "@/lib/types";

export function CommentsSection({
  itemPath,
  canWrite,
}: {
  itemPath: string;
  canWrite: boolean;
}) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeComments(itemPath, setComments), [itemPath]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !text.trim()) return;
    setBusy(true);
    try {
      await addComment({ itemPath, userId: user.uid, userName: profile.name, text });
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
        Comments {comments ? `(${comments.length})` : ""}
      </h3>

      {comments === null ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-400">No comments yet.</p>
      ) : (
        <ul className="space-y-3 mb-4">
          {comments.map((c) => (
            <li key={c.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{c.userName}</span>
                <span className="text-xs text-gray-400">{formatRelative(c.createdAt)}</span>
                {user?.uid === c.userId && (
                  <button
                    onClick={() => deleteComment(itemPath, c.id)}
                    className="ml-auto text-xs text-gray-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="text-gray-700 whitespace-pre-wrap mt-0.5">{c.text}</div>
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <form onSubmit={submit} className="flex gap-2 pt-2 border-t">
          <input
            className="input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
          />
          <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>
            Post
          </button>
        </form>
      ) : (
        <p className="text-xs text-gray-400 border-t pt-3">
          {user ? "Join this stag to comment." : "Sign in to comment."}
        </p>
      )}
    </section>
  );
}
