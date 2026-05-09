import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import { ideaPath, ideasPath } from "./paths";
import type { Idea, IdeaCategory } from "../types";
import { logActivity } from "./activity";

export async function createIdea(input: {
  eventId: string;
  title: string;
  description: string;
  category: IdeaCategory;
  estimatedCost: number;
  createdBy: string;
  createdByName: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, ideasPath(input.eventId)), {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    estimatedCost: input.estimatedCost,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: serverTimestamp(),
    voteCount: 0,
  });

  await logActivity({
    eventId: input.eventId,
    type: "idea_created",
    message: `${input.createdByName} pitched "${input.title}"`,
    userId: input.createdBy,
    userName: input.createdByName,
  });

  return ref.id;
}

export async function getIdea(eventId: string, ideaId: string): Promise<Idea | null> {
  const snap = await getDoc(doc(db, ideaPath(eventId, ideaId)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Idea, "id">) };
}

export function subscribeIdeas(
  eventId: string,
  cb: (ideas: Idea[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, ideasPath(eventId)), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Idea, "id">) }));
    list.sort((a, b) => b.voteCount - a.voteCount);
    cb(list);
  });
}

export async function deleteIdea(eventId: string, ideaId: string) {
  await deleteDoc(doc(db, ideaPath(eventId, ideaId)));
}
