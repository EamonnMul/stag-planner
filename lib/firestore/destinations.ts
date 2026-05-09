import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { destinationPath, destinationsPath } from "./paths";
import type { Destination } from "../types";
import { logActivity } from "./activity";

export async function createDestination(input: {
  eventId: string;
  name: string;
  country: string;
  city: string;
  description: string;
  estimatedCost: number;
  travelNotes: string;
  nightlifeRating: number;
  activityRating: number;
  createdBy: string;
  createdByName: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, destinationsPath(input.eventId)), {
    name: input.name.trim(),
    country: input.country.trim(),
    city: input.city.trim(),
    description: input.description.trim(),
    estimatedCost: input.estimatedCost,
    travelNotes: input.travelNotes.trim(),
    nightlifeRating: clampRating(input.nightlifeRating),
    activityRating: clampRating(input.activityRating),
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: serverTimestamp(),
    voteCount: 0,
  });

  await logActivity({
    eventId: input.eventId,
    type: "destination_created",
    message: `${input.createdByName} suggested ${input.name}`,
    userId: input.createdBy,
    userName: input.createdByName,
  });

  return ref.id;
}

export async function getDestination(eventId: string, destinationId: string): Promise<Destination | null> {
  const snap = await getDoc(doc(db, destinationPath(eventId, destinationId)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Destination, "id">) };
}

export function subscribeDestinations(
  eventId: string,
  cb: (list: Destination[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, destinationsPath(eventId)), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Destination, "id">) }));
    list.sort((a, b) => b.voteCount - a.voteCount);
    cb(list);
  });
}

export function subscribeDestination(
  eventId: string,
  destinationId: string,
  cb: (destination: Destination | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, destinationPath(eventId, destinationId)), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Destination, "id">) } : null);
  });
}

export async function updateDestination(
  eventId: string,
  destinationId: string,
  patch: Partial<Omit<Destination, "id" | "createdBy" | "createdByName" | "createdAt" | "voteCount">>
) {
  const data: Record<string, unknown> = { ...patch };
  if ("nightlifeRating" in patch && patch.nightlifeRating !== undefined)
    data.nightlifeRating = clampRating(patch.nightlifeRating);
  if ("activityRating" in patch && patch.activityRating !== undefined)
    data.activityRating = clampRating(patch.activityRating);
  await updateDoc(doc(db, destinationPath(eventId, destinationId)), data);
}

export async function deleteDestination(eventId: string, destinationId: string) {
  await deleteDoc(doc(db, destinationPath(eventId, destinationId)));
}

function clampRating(n: number): number {
  return Math.max(1, Math.min(5, Math.round(n)));
}
