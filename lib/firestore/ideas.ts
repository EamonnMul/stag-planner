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
import { ideaPath, ideasPath } from "./paths";
import type { Idea, ItemStatus, Workstream } from "../types";
import { logActivity } from "./activity";

export async function createIdea(input: {
  eventId: string;
  title: string;
  description: string;
  workstream: Workstream;
  estimatedCost: number;
  labels: string[];
  createdBy: string;
  createdByName: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, ideasPath(input.eventId)), {
    title: input.title.trim(),
    description: input.description.trim(),
    workstream: input.workstream,
    estimatedCost: input.estimatedCost,
    status: "suggested" as ItemStatus,
    labels: input.labels,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: serverTimestamp(),
    voteCount: 0,
    commentCount: 0,
  });

  await logActivity({
    eventId: input.eventId,
    type: "idea_created",
    message: `${input.createdByName} pitched "${input.title.trim()}"`,
    userId: input.createdBy,
    userName: input.createdByName,
    entityKind: "idea",
    entityId: ref.id,
  });

  return ref.id;
}

export async function getIdea(eventId: string, ideaId: string): Promise<Idea | null> {
  const snap = await getDoc(doc(db, ideaPath(eventId, ideaId)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Idea, "id">) };
}

export function subscribeIdeas(eventId: string, cb: (ideas: Idea[]) => void): Unsubscribe {
  return onSnapshot(collection(db, ideasPath(eventId)), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Idea, "id">) }));
    list.sort((a, b) => b.voteCount - a.voteCount);
    cb(list);
  });
}

export async function updateIdea(args: {
  eventId: string;
  ideaId: string;
  patch: Partial<Pick<Idea, "title" | "description" | "workstream" | "labels" | "estimatedCost">>;
}) {
  await updateDoc(doc(db, ideaPath(args.eventId, args.ideaId)), { ...args.patch });
}

export async function setIdeaStatus(args: {
  eventId: string;
  ideaId: string;
  status: ItemStatus;
  actor: { id: string; name: string };
}) {
  const { eventId, ideaId, status, actor } = args;
  const ref = doc(db, ideaPath(eventId, ideaId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const before = snap.data() as Idea;
  if (before.status === status) return;
  await updateDoc(ref, { status });
  await logActivity({
    eventId,
    type: "idea_status_changed",
    message: `${actor.name} moved "${before.title}" to ${status.replace("_", " ")}`,
    userId: actor.id,
    userName: actor.name,
    entityKind: "idea",
    entityId: ideaId,
  });
}

export async function deleteIdea(eventId: string, ideaId: string) {
  await deleteDoc(doc(db, ideaPath(eventId, ideaId)));
}
