import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { taskPath, tasksPath } from "./paths";
import type { Task, TaskPriority, TaskStatus } from "../types";
import { logActivity } from "./activity";

export async function createTask(input: {
  eventId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: Date | null;
  assigneeId: string | null;
  assigneeName: string | null;
  createdBy: string;
  createdByName: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, tasksPath(input.eventId)), {
    title: input.title.trim(),
    description: input.description.trim(),
    status: "todo" as TaskStatus,
    priority: input.priority,
    dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
    assigneeId: input.assigneeId,
    assigneeName: input.assigneeName,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: serverTimestamp(),
  });

  await logActivity({
    eventId: input.eventId,
    type: "task_created",
    message: `${input.createdByName} added task "${input.title}"`,
    userId: input.createdBy,
    userName: input.createdByName,
  });

  return ref.id;
}

export function subscribeTasks(
  eventId: string,
  cb: (tasks: Task[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, tasksPath(eventId)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, "id">) })));
  });
}

export async function updateTaskStatus(
  eventId: string,
  taskId: string,
  status: TaskStatus,
  actor: { id: string; name: string }
) {
  const ref = doc(db, taskPath(eventId, taskId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const task = snap.data() as Task;
  await updateDoc(ref, { status });
  await logActivity({
    eventId,
    type: "task_status_changed",
    message: `${actor.name} moved "${task.title}" to ${status.replace("_", " ")}`,
    userId: actor.id,
    userName: actor.name,
  });
}

export async function updateTask(
  eventId: string,
  taskId: string,
  patch: Partial<Pick<Task, "title" | "description" | "priority" | "assigneeId" | "assigneeName">> & {
    dueDate?: Date | null;
  }
) {
  const data: Record<string, unknown> = { ...patch };
  if (patch.dueDate !== undefined) data.dueDate = patch.dueDate ? Timestamp.fromDate(patch.dueDate) : null;
  await updateDoc(doc(db, taskPath(eventId, taskId)), data);
}

export async function deleteTask(eventId: string, taskId: string) {
  await deleteDoc(doc(db, taskPath(eventId, taskId)));
}
