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
import { prosConsPath } from "./paths";
import type { ProConItem, ProConType } from "../types";

export async function addProCon(args: {
  itemPath: string;
  userId: string;
  userName: string;
  text: string;
  type: ProConType;
}) {
  const { itemPath, userId, userName, text, type } = args;
  await addDoc(collection(db, prosConsPath(itemPath)), {
    text: text.trim(),
    type,
    userId,
    userName,
    createdAt: serverTimestamp(),
  });
}

export async function deleteProCon(itemPath: string, id: string) {
  await deleteDoc(doc(db, prosConsPath(itemPath), id));
}

export function subscribeProsCons(
  itemPath: string,
  cb: (items: ProConItem[]) => void
): Unsubscribe {
  const q = query(collection(db, prosConsPath(itemPath)), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProConItem, "id">) })));
  });
}
