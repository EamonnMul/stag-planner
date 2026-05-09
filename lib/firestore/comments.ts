import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import { commentsPath } from "./paths";
import type { Comment } from "../types";

export async function addComment(args: {
  itemPath: string;
  userId: string;
  userName: string;
  text: string;
}) {
  const { itemPath, userId, userName, text } = args;
  await addDoc(collection(db, commentsPath(itemPath)), {
    text: text.trim(),
    userId,
    userName,
    createdAt: serverTimestamp(),
  });
}

export async function deleteComment(itemPath: string, commentId: string) {
  await deleteDoc(doc(db, commentsPath(itemPath), commentId));
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
