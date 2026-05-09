import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  decisionOptionPath,
  decisionOptionsPath,
  decisionPath,
  decisionsPath,
} from "./paths";
import type { Decision, DecisionOption, DecisionStatus } from "../types";
import { logActivity } from "./activity";

export async function createDecision(input: {
  eventId: string;
  title: string;
  description: string;
  dueDate: Date | null;
  createdBy: string;
  createdByName: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, decisionsPath(input.eventId)), {
    title: input.title.trim(),
    description: input.description.trim(),
    status: "open" as DecisionStatus,
    dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    chosenOptionId: null,
    chosenOptionText: null,
    optionCount: 0,
    commentCount: 0,
  });

  await logActivity({
    eventId: input.eventId,
    type: "decision_created",
    message: `${input.createdByName} opened decision "${input.title.trim()}"`,
    userId: input.createdBy,
    userName: input.createdByName,
    entityKind: "decision",
    entityId: ref.id,
  });

  return ref.id;
}

export async function getDecision(eventId: string, decisionId: string): Promise<Decision | null> {
  const snap = await getDoc(doc(db, decisionPath(eventId, decisionId)));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Decision, "id">) };
}

export function subscribeDecisions(
  eventId: string,
  cb: (list: Decision[]) => void
): Unsubscribe {
  const q = query(collection(db, decisionsPath(eventId)), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Decision, "id">) })));
  });
}

export function subscribeDecision(
  eventId: string,
  decisionId: string,
  cb: (d: Decision | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, decisionPath(eventId, decisionId)), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Decision, "id">) } : null);
  });
}

export async function updateDecisionStatus(args: {
  eventId: string;
  decisionId: string;
  status: DecisionStatus;
  actor: { id: string; name: string };
}) {
  const { eventId, decisionId, status, actor } = args;
  const ref = doc(db, decisionPath(eventId, decisionId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const before = snap.data() as Decision;
  if (before.status === status) return;

  await updateDoc(ref, { status, updatedAt: serverTimestamp() });

  await logActivity({
    eventId,
    type: "decision_status_changed",
    message: `${actor.name} marked "${before.title}" ${status}`,
    userId: actor.id,
    userName: actor.name,
    entityKind: "decision",
    entityId: decisionId,
  });
}

export async function deleteDecision(eventId: string, decisionId: string) {
  await deleteDoc(doc(db, decisionPath(eventId, decisionId)));
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export async function addDecisionOption(input: {
  eventId: string;
  decisionId: string;
  text: string;
  description: string;
  createdBy: string;
  createdByName: string;
}) {
  const decisionRef = doc(db, decisionPath(input.eventId, input.decisionId));
  const optionRef = doc(collection(db, decisionOptionsPath(input.eventId, input.decisionId)));

  await runTransaction(db, async (tx) => {
    const decisionSnap = await tx.get(decisionRef);
    if (!decisionSnap.exists()) throw new Error("Decision missing");
    const count = (decisionSnap.data().optionCount as number | undefined) ?? 0;
    tx.set(optionRef, {
      text: input.text.trim(),
      description: input.description.trim(),
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      createdAt: serverTimestamp(),
      voteCount: 0,
    });
    tx.update(decisionRef, { optionCount: count + 1, updatedAt: serverTimestamp() });
  });

  await logActivity({
    eventId: input.eventId,
    type: "decision_option_added",
    message: `${input.createdByName} added option "${input.text.trim()}"`,
    userId: input.createdBy,
    userName: input.createdByName,
    entityKind: "decision",
    entityId: input.decisionId,
  });
}

export async function deleteDecisionOption(args: {
  eventId: string;
  decisionId: string;
  optionId: string;
}) {
  const { eventId, decisionId, optionId } = args;
  const decisionRef = doc(db, decisionPath(eventId, decisionId));
  const optionRef = doc(db, decisionOptionPath(eventId, decisionId, optionId));
  await runTransaction(db, async (tx) => {
    const [decisionSnap, optionSnap] = await Promise.all([
      tx.get(decisionRef),
      tx.get(optionRef),
    ]);
    if (!optionSnap.exists()) return;
    const count = (decisionSnap.data()?.optionCount as number | undefined) ?? 0;
    const data = decisionSnap.data() as Decision;
    tx.delete(optionRef);
    const patch: Record<string, unknown> = {
      optionCount: Math.max(0, count - 1),
      updatedAt: serverTimestamp(),
    };
    if (data.chosenOptionId === optionId) {
      patch.chosenOptionId = null;
      patch.chosenOptionText = null;
    }
    tx.update(decisionRef, patch);
  });
}

export function subscribeDecisionOptions(
  eventId: string,
  decisionId: string,
  cb: (list: DecisionOption[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, decisionOptionsPath(eventId, decisionId)), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DecisionOption, "id">) }));
    list.sort((a, b) => b.voteCount - a.voteCount);
    cb(list);
  });
}

/**
 * Mark an option as the chosen one (organiser only — enforced by rules).
 * Setting also flips the decision status to "decided".
 */
export async function chooseOption(args: {
  eventId: string;
  decisionId: string;
  optionId: string;
  optionText: string;
  actor: { id: string; name: string };
}) {
  const { eventId, decisionId, optionId, optionText, actor } = args;
  await updateDoc(doc(db, decisionPath(eventId, decisionId)), {
    chosenOptionId: optionId,
    chosenOptionText: optionText,
    status: "decided" as DecisionStatus,
    updatedAt: serverTimestamp(),
  });
  await logActivity({
    eventId,
    type: "decision_chosen",
    message: `${actor.name} picked "${optionText}"`,
    userId: actor.id,
    userName: actor.name,
    entityKind: "decision",
    entityId: decisionId,
  });
}

export async function clearChosenOption(args: {
  eventId: string;
  decisionId: string;
  actor: { id: string; name: string };
}) {
  const { eventId, decisionId, actor } = args;
  await updateDoc(doc(db, decisionPath(eventId, decisionId)), {
    chosenOptionId: null,
    chosenOptionText: null,
    status: "open" as DecisionStatus,
    updatedAt: serverTimestamp(),
  });
  await logActivity({
    eventId,
    type: "decision_status_changed",
    message: `${actor.name} reopened the decision`,
    userId: actor.id,
    userName: actor.name,
    entityKind: "decision",
    entityId: decisionId,
  });
}
