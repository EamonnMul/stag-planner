import {
  doc,
  getDoc,
  collection,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import { userVotePath, votesPath } from "./paths";
import type { Vote } from "../types";

/**
 * Toggle a user's vote on an item.
 *
 * Uses a Firestore transaction to keep `voteCount` on the parent doc in sync
 * with the presence/absence of `<itemPath>/votes/{userId}`. The vote doc id
 * IS the userId, which makes duplicate votes structurally impossible — no
 * second write can ever create a second doc for the same user.
 *
 * Returns the new state: true if user now has a vote, false if removed.
 */
export async function toggleVote(args: {
  itemPath: string;
  userId: string;
  userName: string;
}): Promise<boolean> {
  const { itemPath, userId, userName } = args;
  const itemRef = doc(db, itemPath);
  const voteRef = doc(db, userVotePath(itemPath, userId));

  return runTransaction(db, async (tx) => {
    const itemSnap = await tx.get(itemRef);
    if (!itemSnap.exists()) throw new Error("Item no longer exists");
    const voteSnap = await tx.get(voteRef);
    const currentCount = (itemSnap.data().voteCount as number | undefined) ?? 0;

    if (voteSnap.exists()) {
      tx.delete(voteRef);
      tx.update(itemRef, { voteCount: Math.max(0, currentCount - 1) });
      return false;
    }
    tx.set(voteRef, {
      userId,
      userName,
      value: 1,
      createdAt: serverTimestamp(),
    });
    tx.update(itemRef, { voteCount: currentCount + 1 });
    return true;
  });
}

export async function hasUserVoted(itemPath: string, userId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, userVotePath(itemPath, userId)));
  return snap.exists();
}

export async function listVotes(itemPath: string): Promise<Vote[]> {
  const snap = await getDocs(collection(db, votesPath(itemPath)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Vote, "id">) }));
}

/**
 * Live subscription to whether the current user has voted on a given item.
 * Use in components for instant UI feedback.
 */
export function subscribeUserVote(
  itemPath: string,
  userId: string,
  cb: (voted: boolean) => void
): Unsubscribe {
  return onSnapshot(doc(db, userVotePath(itemPath, userId)), (snap) => {
    cb(snap.exists());
  });
}
