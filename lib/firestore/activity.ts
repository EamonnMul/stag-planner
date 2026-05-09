import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import { activityPath } from "./paths";
import type { ActivityLogEntry, ActivityType } from "../types";

export async function logActivity(entry: {
  eventId: string;
  type: ActivityType;
  message: string;
  userId: string;
  userName: string;
}) {
  const { eventId, ...rest } = entry;
  await addDoc(collection(db, activityPath(eventId)), {
    ...rest,
    createdAt: serverTimestamp(),
  });
}

export function subscribeActivity(
  eventId: string,
  max: number,
  cb: (entries: ActivityLogEntry[]) => void
): Unsubscribe {
  const q = query(
    collection(db, activityPath(eventId)),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ActivityLogEntry, "id">) })));
  });
}
