import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Idea, IdeaCategory, Comment } from "../types";
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
  const ref = await addDoc(collection(db, "ideas"), {
    eventId: input.eventId,
    title: input.title,
    description: input.description,
    category: input.category,
    estimatedCost: input.estimatedCost,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: serverTimestamp(),
    upvotes: 0,
    downvotes: 0,
    score: 0,
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

export async function listIdeas(eventId: string): Promise<Idea[]> {
  const q = query(collection(db, "ideas"), where("eventId", "==", eventId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Idea, "id">) }))
    .sort((a, b) => b.score - a.score);
}

export async function deleteIdea(ideaId: string) {
  await deleteDoc(doc(db, "ideas", ideaId));
}

export async function castVote(input: {
  ideaId: string;
  eventId: string;
  userId: string;
  userName: string;
  value: 1 | -1;
}) {
  const voteId = `${input.ideaId}_${input.userId}`;
  const voteRef = doc(db, "votes", voteId);
  const ideaRef = doc(db, "ideas", input.ideaId);

  const [voteSnap, ideaSnap] = await Promise.all([getDoc(voteRef), getDoc(ideaRef)]);
  if (!ideaSnap.exists()) throw new Error("Idea not found");

  const previous = voteSnap.exists() ? (voteSnap.data().value as 1 | -1) : 0;
  if (previous === input.value) return;

  let upDelta = 0;
  let downDelta = 0;
  if (previous === 1) upDelta -= 1;
  if (previous === -1) downDelta -= 1;
  if (input.value === 1) upDelta += 1;
  if (input.value === -1) downDelta += 1;

  await setDoc(voteRef, {
    ideaId: input.ideaId,
    eventId: input.eventId,
    userId: input.userId,
    value: input.value,
    createdAt: serverTimestamp(),
  });

  await updateDoc(ideaRef, {
    upvotes: increment(upDelta),
    downvotes: increment(downDelta),
    score: increment(upDelta - downDelta),
  });

  await logActivity({
    eventId: input.eventId,
    type: "idea_voted",
    message: `${input.userName} voted on "${ideaSnap.data().title}"`,
    userId: input.userId,
    userName: input.userName,
  });
}

export async function getUserVote(ideaId: string, userId: string): Promise<1 | -1 | 0> {
  const snap = await getDoc(doc(db, "votes", `${ideaId}_${userId}`));
  return snap.exists() ? (snap.data().value as 1 | -1) : 0;
}

export async function listVotesForUser(eventId: string, userId: string): Promise<Record<string, 1 | -1>> {
  const q = query(
    collection(db, "votes"),
    where("eventId", "==", eventId),
    where("userId", "==", userId)
  );
  const snap = await getDocs(q);
  const out: Record<string, 1 | -1> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    out[data.ideaId] = data.value;
  });
  return out;
}

export async function addComment(input: {
  eventId: string;
  ideaId: string;
  userId: string;
  userName: string;
  text: string;
}) {
  await addDoc(collection(db, "comments"), {
    eventId: input.eventId,
    ideaId: input.ideaId,
    userId: input.userId,
    userName: input.userName,
    text: input.text,
    createdAt: serverTimestamp(),
  });
  await logActivity({
    eventId: input.eventId,
    type: "comment_added",
    message: `${input.userName} commented on an idea`,
    userId: input.userId,
    userName: input.userName,
  });
}

export async function listComments(ideaId: string): Promise<Comment[]> {
  const q = query(collection(db, "comments"), where("ideaId", "==", ideaId), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Comment, "id">) }));
}
