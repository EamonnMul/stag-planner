import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
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
  const ref = await addDoc(collection(db, "tasks"), {
    eventId: input.eventId,
    title: input.title,
    description: input.description,
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

export async function listTasks(eventId: string): Promise<Task[]> {
  const q = query(collection(db, "tasks"), where("eventId", "==", eventId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, "id">) }));
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  actor: { id: string; name: string }
) {
  const taskRef = doc(db, "tasks", taskId);
  const snap = await getDoc(taskRef);
  if (!snap.exists()) return;
  const task = snap.data() as Task;
  await updateDoc(taskRef, { status });
  await logActivity({
    eventId: task.eventId,
    type: "task_status_changed",
    message: `${actor.name} moved "${task.title}" to ${status.replace("_", " ")}`,
    userId: actor.id,
    userName: actor.name,
  });
}

export async function updateTask(
  taskId: string,
  patch: Partial<Pick<Task, "title" | "description" | "priority" | "assigneeId" | "assigneeName">> & {
    dueDate?: Date | null;
  }
) {
  const data: Record<string, unknown> = { ...patch };
  if (patch.dueDate !== undefined) data.dueDate = patch.dueDate ? Timestamp.fromDate(patch.dueDate) : null;
  await updateDoc(doc(db, "tasks", taskId), data);
}

export async function deleteTask(taskId: string) {
  await deleteDoc(doc(db, "tasks", taskId));
}
