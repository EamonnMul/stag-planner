import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import { commentsPath } from "./paths";
import type { Comment } from "../types";

/**
 * Add a comment AND increment the parent's commentCount in one transaction.
 * Parent docs are required to have a numeric `commentCount` field; we fall
 * back to 0 if missing for forward-compat with older docs.
 */
export async function addComment(args: {
  itemPath: string;
  userId: string;
  userName: string;
  text: string;
}) {
  const { itemPath, userId, userName, text } = args;
  const parentRef = doc(db, itemPath);
  const commentRef = doc(collection(parentRef, "comments"));

  await runTransaction(db, async (tx) => {
    const parentSnap = await tx.get(parentRef);
    const current = (parentSnap.data()?.commentCount as number | undefined) ?? 0;
    tx.set(commentRef, {
      text: text.trim(),
      userId,
      userName,
      createdAt: serverTimestamp(),
    });
    tx.update(parentRef, { commentCount: current + 1 });
  });
}

export async function deleteComment(itemPath: string, commentId: string) {
  const parentRef = doc(db, itemPath);
  const commentRef = doc(parentRef, "comments", commentId);
  await runTransaction(db, async (tx) => {
    const [parentSnap, commentSnap] = await Promise.all([tx.get(parentRef), tx.get(commentRef)]);
    if (!commentSnap.exists()) return;
    const current = (parentSnap.data()?.commentCount as number | undefined) ?? 0;
    tx.delete(commentRef);
    tx.update(parentRef, { commentCount: Math.max(0, current - 1) });
  });
}

export function subscribeComments(
  itemPath: string,
  cb: (comments: Comment[]) => void
): Unsubscribe {
  const q = query(collection(db, commentsPath(itemPath)), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Comment, "id">) })));
  });
}
