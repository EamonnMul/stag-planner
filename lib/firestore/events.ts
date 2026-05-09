import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import type { StagEvent, Member, Role } from "../types";
import { logActivity } from "./activity";

export async function createEvent(input: {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  organiserId: string;
  organiserName: string;
  organiserEmail: string;
}): Promise<string> {
  const eventRef = await addDoc(collection(db, "stagEvents"), {
    title: input.title,
    description: input.description,
    location: input.location,
    startDate: Timestamp.fromDate(input.startDate),
    endDate: Timestamp.fromDate(input.endDate),
    organiserId: input.organiserId,
    memberIds: [input.organiserId],
    createdAt: serverTimestamp(),
  });

  await addDoc(collection(db, "members"), {
    eventId: eventRef.id,
    userId: input.organiserId,
    name: input.organiserName,
    email: input.organiserEmail,
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
  const snap = await getDoc(doc(db, "stagEvents", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<StagEvent, "id">) };
}

export async function listEventsForUser(userId: string): Promise<StagEvent[]> {
  const q = query(
    collection(db, "stagEvents"),
    where("memberIds", "array-contains", userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StagEvent, "id">) }));
}

export async function updateEvent(
  id: string,
  patch: Partial<Pick<StagEvent, "title" | "description" | "location"> & {
    startDate?: Date;
    endDate?: Date;
  }>
) {
  const data: Record<string, unknown> = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.description !== undefined) data.description = patch.description;
  if (patch.location !== undefined) data.location = patch.location;
  if (patch.startDate) data.startDate = Timestamp.fromDate(patch.startDate);
  if (patch.endDate) data.endDate = Timestamp.fromDate(patch.endDate);
  await updateDoc(doc(db, "stagEvents", id), data);
}

export async function listMembers(eventId: string): Promise<Member[]> {
  const q = query(collection(db, "members"), where("eventId", "==", eventId));
  const snap = await getDocs(q);
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

  const existing = query(
    collection(db, "members"),
    where("eventId", "==", eventId),
    where("userId", "==", userId)
  );
  const existingSnap = await getDocs(existing);
  if (!existingSnap.empty) return { added: false, reason: "User is already a member." };

  const batch = writeBatch(db);
  const memberRef = doc(collection(db, "members"));
  batch.set(memberRef, {
    eventId,
    userId,
    name: userData.name,
    email: userData.email,
    avatarUrl: userData.avatarUrl ?? null,
    role: "member" as Role,
    joinedAt: serverTimestamp(),
  });
  batch.update(doc(db, "stagEvents", eventId), { memberIds: arrayUnion(userId) });
  await batch.commit();

  await logActivity({
    eventId,
    type: "member_joined",
    message: `${userData.name} was added to the stag by ${inviter.name}`,
    userId: inviter.id,
    userName: inviter.name,
  });

  return { added: true };
}

export async function removeMember(eventId: string, memberDocId: string, userId: string) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "members", memberDocId));
  batch.update(doc(db, "stagEvents", eventId), { memberIds: arrayRemove(userId) });
  await batch.commit();
}
