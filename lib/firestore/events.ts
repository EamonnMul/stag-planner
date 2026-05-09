import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { eventPath, membersPath } from "./paths";
import type { Member, Role, StagEvent, Visibility } from "../types";
import { logActivity } from "./activity";

export async function createEvent(input: {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  visibility: Visibility;
  organiserId: string;
  organiserName: string;
  organiserEmail: string;
  organiserAvatarUrl?: string | null;
}): Promise<string> {
  const eventRef = await addDoc(collection(db, "stagEvents"), {
    title: input.title,
    description: input.description,
    location: input.location,
    startDate: Timestamp.fromDate(input.startDate),
    endDate: Timestamp.fromDate(input.endDate),
    organiserId: input.organiserId,
    organiserName: input.organiserName,
    memberIds: [input.organiserId],
    visibility: input.visibility,
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, membersPath(eventRef.id)), {
    userId: input.organiserId,
    name: input.organiserName,
    email: input.organiserEmail,
    avatarUrl: input.organiserAvatarUrl ?? null,
    role: "organiser" as Role,
    joinedAt: serverTimestamp(),
  });

  await logActivity({
    eventId: eventRef.id,
    type: "event_created",
    message: `${input.organiserName} created the event`,
    userId: input.organiserId,
    userName: input.organiserName,
  });

  return eventRef.id;
}

export async function getEvent(id: string): Promise<StagEvent | null> {
  const snap = await getDoc(doc(db, eventPath(id)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<StagEvent, "id">) };
}

export function subscribeEvent(id: string, cb: (event: StagEvent | null) => void): Unsubscribe {
  return onSnapshot(doc(db, eventPath(id)), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<StagEvent, "id">) } : null);
  });
}

export async function listEventsForUser(userId: string): Promise<StagEvent[]> {
  const q = query(collection(db, "stagEvents"), where("memberIds", "array-contains", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StagEvent, "id">) }));
}

export async function updateEvent(
  id: string,
  patch: Partial<Pick<StagEvent, "title" | "description" | "location" | "visibility">> & {
    startDate?: Date;
    endDate?: Date;
  }
) {
  const data: Record<string, unknown> = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.location !== undefined) data.location = patch.location;
  if (patch.visibility !== undefined) data.visibility = patch.visibility;
  if (patch.startDate) data.startDate = Timestamp.fromDate(patch.startDate);
  if (patch.endDate) data.endDate = Timestamp.fromDate(patch.endDate);
  await updateDoc(doc(db, eventPath(id)), data);
}

export function subscribeMembers(
  eventId: string,
  cb: (members: Member[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, membersPath(eventId)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Member, "id">) })));
  });
}

export async function listMembers(eventId: string): Promise<Member[]> {
  const snap = await getDocs(collection(db, membersPath(eventId)));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Member, "id">) }));
}

export async function inviteMemberByEmail(
  eventId: string,
  email: string,
  inviter: { id: string; name: string }
): Promise<{ added: boolean; reason?: string }> {
  const userQ = query(collection(db, "users"), where("email", "==", email.trim().toLowerCase()));
  const userSnap = await getDocs(userQ);
  if (userSnap.empty) return { added: false, reason: "No user found with that email." };
  const userDoc = userSnap.docs[0];
  const userId = userDoc.id;
  const userData = userDoc.data() as { name: string; email: string; avatarUrl?: string | null };

  const existing = query(collection(db, membersPath(eventId)), where("userId", "==", userId));
  if (!(await getDocs(existing)).empty) return { added: false, reason: "User is already a member." };

  const batch = writeBatch(db);
  const memberRef = doc(collection(db, membersPath(eventId)));
  batch.set(memberRef, {
    userId,
    name: userData.name,
    email: userData.email,
    avatarUrl: userData.avatarUrl ?? null,
    role: "member" as Role,
    joinedAt: serverTimestamp(),
  });
  batch.update(doc(db, eventPath(eventId)), { memberIds: arrayUnion(userId) });
  await batch.commit();

  await logActivity({
    eventId,
    type: "member_joined",
    message: `${userData.name} was added by ${inviter.name}`,
    userId: inviter.id,
    userName: inviter.name,
  });

  return { added: true };
}

/**
 * Self-join a public event. Idempotent — safe to call if already a member.
 */
export async function joinPublicEvent(
  eventId: string,
  user: { uid: string; name: string; email: string; avatarUrl?: string | null }
): Promise<void> {
  const eventRef = doc(db, eventPath(eventId));
  const eventSnap = await getDoc(eventRef);
  if (!eventSnap.exists()) throw new Error("Event not found");
  const event = eventSnap.data() as Omit<StagEvent, "id">;
  if (event.visibility !== "public") throw new Error("Event is not public");
  if (event.memberIds.includes(user.uid)) return;

  const batch = writeBatch(db);
  const memberRef = doc(collection(db, membersPath(eventId)));
  batch.set(memberRef, {
    userId: user.uid,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    role: "member" as Role,
    joinedAt: serverTimestamp(),
  });
  batch.update(eventRef, { memberIds: arrayUnion(user.uid) });
  await batch.commit();

  await logActivity({
    eventId,
    type: "member_joined",
    message: `${user.name} joined`,
    userId: user.uid,
    userName: user.name,
  });
}

export async function removeMember(eventId: string, memberDocId: string, userId: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, membersPath(eventId), memberDocId));
  batch.update(doc(db, eventPath(eventId)), { memberIds: arrayRemove(userId) });
  await batch.commit();
}
