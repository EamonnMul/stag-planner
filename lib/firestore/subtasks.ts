import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";
import { subtasksPath, taskPath } from "./paths";
import type { Subtask } from "../types";
import { logActivity } from "./activity";

/**
 * Add a subtask, incrementing subtaskTotal on the parent task atomically.
 */
export async function addSubtask(args: {
  eventId: string;
  taskId: string;
  text: string;
  userId: string;
  userName: string;
}) {
  const { eventId, taskId, text, userId, userName } = args;
  const taskRef = doc(db, taskPath(eventId, taskId));
  const subRef = doc(collection(db, subtasksPath(eventId, taskId)));

  await runTransaction(db, async (tx) => {
    const taskSnap = await tx.get(taskRef);
    if (!taskSnap.exists()) throw new Error("Task no longer exists");
    const total = (taskSnap.data().subtaskTotal as number | undefined) ?? 0;
    tx.set(subRef, {
      text: text.trim(),
      completed: false,
      createdBy: userId,
      createdAt: serverTimestamp(),
      completedBy: null,
      completedAt: null,
    });
    tx.update(taskRef, { subtaskTotal: total + 1 });
  });

  await logActivity({
    eventId,
    type: "subtask_added",
    message: `${userName} added "${text.trim()}"`,
    userId,
    userName,
    entityKind: "task",
    entityId: taskId,
  });
}

export async function toggleSubtask(args: {
  eventId: string;
  taskId: string;
  subtaskId: string;
  userId: string;
  userName: string;
}): Promise<boolean> {
  const { eventId, taskId, subtaskId, userId, userName } = args;
  const taskRef = doc(db, taskPath(eventId, taskId));
  const subRef = doc(db, subtasksPath(eventId, taskId), subtaskId);

  const result = await runTransaction(db, async (tx) => {
    const [taskSnap, subSnap] = await Promise.all([tx.get(taskRef), tx.get(subRef)]);
    if (!taskSnap.exists() || !subSnap.exists()) throw new Error("Missing");
    const completedCurrent = (taskSnap.data().subtaskCompleted as number | undefined) ?? 0;
    const wasCompleted = !!subSnap.data().completed;
    const nowCompleted = !wasCompleted;
    tx.update(subRef, {
      completed: nowCompleted,
      completedBy: nowCompleted ? userId : null,
      completedAt: nowCompleted ? serverTimestamp() : null,
    });
    tx.update(taskRef, {
      subtaskCompleted: nowCompleted ? completedCurrent + 1 : Math.max(0, completedCurrent - 1),
    });
    return nowCompleted;
  });

  if (result) {
    await logActivity({
      eventId,
      type: "subtask_completed",
      message: `${userName} ticked off a subtask`,
      userId,
      userName,
      entityKind: "task",
      entityId: taskId,
    });
  }
  return result;
}

export async function deleteSubtask(args: {
  eventId: string;
  taskId: string;
  subtaskId: string;
}) {
  const { eventId, taskId, subtaskId } = args;
  const taskRef = doc(db, taskPath(eventId, taskId));
  const subRef = doc(db, subtasksPath(eventId, taskId), subtaskId);
  await runTransaction(db, async (tx) => {
    const [taskSnap, subSnap] = await Promise.all([tx.get(taskRef), tx.get(subRef)]);
    if (!subSnap.exists()) return;
    const wasCompleted = !!subSnap.data().completed;
    const total = (taskSnap.data()?.subtaskTotal as number | undefined) ?? 0;
    const completed = (taskSnap.data()?.subtaskCompleted as number | undefined) ?? 0;
    tx.delete(subRef);
    tx.update(taskRef, {
      subtaskTotal: Math.max(0, total - 1),
      subtaskCompleted: Math.max(0, completed - (wasCompleted ? 1 : 0)),
    });
  });
}

export function subscribeSubtasks(
  eventId: string,
  taskId: string,
  cb: (list: Subtask[]) => void
): Unsubscribe {
  const q = query(collection(db, subtasksPath(eventId, taskId)), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Subtask, "id">) })));
  });
}
