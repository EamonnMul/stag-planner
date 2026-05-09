import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Unsubscribe,
  where,
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
  entityKind?: ActivityLogEntry["entityKind"];
  entityId?: string;
}) {
  const { eventId, ...rest } = entry;
  const data: Record<string, unknown> = { ...rest, createdAt: serverTimestamp() };
  // Firestore won't allow writing `undefined`. Strip them.
  if (rest.entityKind === undefined) delete data.entityKind;
  if (rest.entityId === undefined) delete data.entityId;
  await addDoc(collection(db, activityPath(eventId)), data);
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

export function subscribeActivityForEntity(
  eventId: string,
  entityKind: NonNullable<ActivityLogEntry["entityKind"]>,
  entityId: string,
  cb: (entries: ActivityLogEntry[]) => void
): Unsubscribe {
  const q = query(
    collection(db, activityPath(eventId)),
    where("entityKind", "==", entityKind),
    where("entityId", "==", entityId),
    orderBy("createdAt", "desc"),
    limit(40)
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ActivityLogEntry, "id">) })));
  });
}
