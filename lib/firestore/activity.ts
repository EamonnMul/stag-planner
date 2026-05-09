import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase";
import type { ActivityLogEntry, ActivityType } from "../types";

export async function logActivity(entry: {
  eventId: string;
  type: ActivityType;
  message: string;
  userId: string;
  userName: string;
}) {
  await addDoc(collection(db, "activityLog"), {
    ...entry,
    createdAt: serverTimestamp(),
  });
}

export async function listRecentActivity(eventId: string, max = 10): Promise<ActivityLogEntry[]> {
  const q = query(
    collection(db, "activityLog"),
    where("eventId", "==", eventId),
    orderBy("createdAt", "desc"),
    limit(max)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ActivityLogEntry, "id">) }));
}
