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
import type {
  Blocker,
  Task,
  TaskPriority,
  TaskStatus,
  Workstream,
} from "../types";
import { logActivity } from "./activity";

export async function createTask(input: {
  eventId: string;
  title: string;
  description: string;
  workstream: Workstream;
  priority: TaskPriority;
  dueDate: Date | null;
  assigneeId: string | null;
  assigneeName: string | null;
  labels: string[];
  blocker: Blocker | null;
  createdBy: string;
  createdByName: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, tasksPath(input.eventId)), {
    title: input.title.trim(),
    description: input.description.trim(),
    status: (input.blocker ? "blocked" : "todo") as TaskStatus,
    priority: input.priority,
    workstream: input.workstream,
    dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
    assigneeId: input.assigneeId,
    assigneeName: input.assigneeName,
    labels: input.labels,
    blocker: input.blocker,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedBy: null,
    completedByName: null,
    completedAt: null,
    commentCount: 0,
    subtaskTotal: 0,
    subtaskCompleted: 0,
    watcherIds: [input.createdBy],
  });

  await logActivity({
    eventId: input.eventId,
    type: "task_created",
    message: `${input.createdByName} added task "${input.title.trim()}"`,
    userId: input.createdBy,
    userName: input.createdByName,
    entityKind: "task",
    entityId: ref.id,
  });

  return ref.id;
}

export function subscribeTasks(eventId: string, cb: (tasks: Task[]) => void): Unsubscribe {
  return onSnapshot(collection(db, tasksPath(eventId)), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Task, "id">) })));
  });
}

export function subscribeTask(
  eventId: string,
  taskId: string,
  cb: (task: Task | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, taskPath(eventId, taskId)), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Task, "id">) } : null);
  });
}

export async function updateTaskStatus(args: {
  eventId: string;
  taskId: string;
  status: TaskStatus;
  actor: { id: string; name: string };
}) {
  const { eventId, taskId, status, actor } = args;
  const ref = doc(db, taskPath(eventId, taskId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const task = snap.data() as Task;

  const data: Record<string, unknown> = { status, updatedAt: serverTimestamp() };
  const wasDone = task.status === "done";
  const willBeDone = status === "done";
  if (willBeDone && !wasDone) {
    data.completedBy = actor.id;
    data.completedByName = actor.name;
    data.completedAt = serverTimestamp();
  } else if (!willBeDone && wasDone) {
    data.completedBy = null;
    data.completedByName = null;
    data.completedAt = null;
  }
  await updateDoc(ref, data);

  if (willBeDone && !wasDone) {
    await logActivity({
      eventId,
      type: "task_completed",
      message: `${actor.name} completed "${task.title}"`,
      userId: actor.id,
      userName: actor.name,
      entityKind: "task",
      entityId: taskId,
    });
  } else if (!willBeDone && wasDone) {
    await logActivity({
      eventId,
      type: "task_reopened",
      message: `${actor.name} reopened "${task.title}"`,
      userId: actor.id,
      userName: actor.name,
      entityKind: "task",
      entityId: taskId,
    });
  } else {
    await logActivity({
      eventId,
      type: "task_status_changed",
      message: `${actor.name} moved "${task.title}" to ${labelFor(status)}`,
      userId: actor.id,
      userName: actor.name,
      entityKind: "task",
      entityId: taskId,
    });
  }
}

export async function updateTask(args: {
  eventId: string;
  taskId: string;
  patch: Partial<Pick<Task, "title" | "description" | "priority" | "workstream" | "labels" | "assigneeId" | "assigneeName">> & {
    dueDate?: Date | null;
    blocker?: Blocker | null;
  };
  actor: { id: string; name: string };
}) {
  const { eventId, taskId, patch, actor } = args;
  const ref = doc(db, taskPath(eventId, taskId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const before = snap.data() as Task;

  const data: Record<string, unknown> = { ...patch, updatedAt: serverTimestamp() };
  if (patch.dueDate !== undefined) data.dueDate = patch.dueDate ? Timestamp.fromDate(patch.dueDate) : null;
  await updateDoc(ref, data);

  // Activity entries for the changes that matter.
  if ("assigneeId" in patch && patch.assigneeId !== before.assigneeId) {
    await logActivity({
      eventId,
      type: "task_assignee_changed",
      message: patch.assigneeName
        ? `${actor.name} assigned "${before.title}" to ${patch.assigneeName}`
        : `${actor.name} unassigned "${before.title}"`,
      userId: actor.id,
      userName: actor.name,
      entityKind: "task",
      entityId: taskId,
    });
  }
  if ("priority" in patch && patch.priority && patch.priority !== before.priority) {
    await logActivity({
      eventId,
      type: "task_priority_changed",
      message: `${actor.name} set priority of "${before.title}" to ${patch.priority}`,
      userId: actor.id,
      userName: actor.name,
      entityKind: "task",
      entityId: taskId,
    });
  }
  if (patch.dueDate !== undefined) {
    const newMillis = patch.dueDate ? patch.dueDate.getTime() : null;
    const oldMillis = before.dueDate ? before.dueDate.toMillis() : null;
    if (newMillis !== oldMillis) {
      await logActivity({
        eventId,
        type: "task_due_date_changed",
        message: patch.dueDate
          ? `${actor.name} set due date of "${before.title}" to ${patch.dueDate.toLocaleDateString()}`
          : `${actor.name} cleared the due date on "${before.title}"`,
        userId: actor.id,
        userName: actor.name,
        entityKind: "task",
        entityId: taskId,
      });
    }
  }
}

export async function deleteTask(eventId: string, taskId: string) {
  await deleteDoc(doc(db, taskPath(eventId, taskId)));
}

function labelFor(s: TaskStatus): string {
  return s.replace("_", " ");
}
