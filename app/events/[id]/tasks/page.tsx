"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Empty } from "@/components/ui/Empty";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import { listMembers } from "@/lib/firestore/events";
import {
  createTask,
  deleteTask,
  listTasks,
  updateTaskStatus,
} from "@/lib/firestore/tasks";
import { formatDate } from "@/lib/format";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Member,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/types";
import { useEvent } from "../event-context";

type Filters = {
  status: TaskStatus | "all";
  assignee: string | "all" | "unassigned";
  priority: TaskPriority | "all";
};

export default function TasksPage() {
  const { event } = useEvent();
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    status: "all",
    assignee: "all",
    priority: "all",
  });

  const refresh = async () => setTasks(await listTasks(event.id));

  useEffect(() => {
    refresh();
    listMembers(event.id).then(setMembers);
  }, [event.id]);

  const filtered = useMemo(() => {
    return (tasks ?? []).filter((t) => {
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      if (filters.assignee === "unassigned" && t.assigneeId) return false;
      if (filters.assignee !== "all" && filters.assignee !== "unassigned" && t.assigneeId !== filters.assignee)
        return false;
      return true;
    });
  }, [tasks, filters]);

  const total = (tasks ?? []).length;
  const done = (tasks ?? []).filter((t) => t.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const cycleStatus = async (t: Task) => {
    if (!user || !profile) return;
    const next: TaskStatus = t.status === "todo" ? "in_progress" : t.status === "in_progress" ? "done" : "todo";
    setTasks((arr) => (arr ?? []).map((x) => (x.id === t.id ? { ...x, status: next } : x)));
    try {
      await updateTaskStatus(t.id, next, { id: user.uid, name: profile.name });
    } catch {
      refresh();
    }
  };

  const canEditTask = (t: Task) =>
    user?.uid === event.organiserId || user?.uid === t.assigneeId || user?.uid === t.createdBy;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Tasks</h1>
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New task</button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">{done}/{total} complete</div>
          <div className="text-sm font-semibold">{pct}%</div>
        </div>
        <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <select className="input" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as Filters["status"] }))}>
          <option value="all">All statuses</option>
          {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className="input" value={filters.assignee} onChange={(e) => setFilters((f) => ({ ...f, assignee: e.target.value }))}>
          <option value="all">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
        </select>
        <select className="input" value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value as Filters["priority"] }))}>
          <option value="all">All priorities</option>
          {TASK_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {tasks === null ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        total === 0 ? (
          <Empty
            title="No tasks yet"
            body="Add the first one — booking, deposit, transport, etc."
            action={<button className="btn-primary" onClick={() => setShowNew(true)}>Add a task</button>}
          />
        ) : (
          <Empty title="Nothing matches" body="Try clearing some filters." />
        )
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => (
            <li key={t.id} className="card flex gap-3 items-start">
              <button
                onClick={() => cycleStatus(t)}
                className={`mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center text-xs ${
                  t.status === "done"
                    ? "bg-green-500 border-green-500 text-white"
                    : t.status === "in_progress"
                    ? "border-brand-500 text-brand-500"
                    : "border-gray-300 text-transparent"
                }`}
                title="Click to change status"
              >
                {t.status === "done" ? "✓" : t.status === "in_progress" ? "…" : ""}
              </button>
              <div className="min-w-0 flex-1">
                <div className={`font-medium ${t.status === "done" ? "line-through text-gray-500" : ""}`}>
                  {t.title}
                </div>
                {t.description && <div className="text-sm text-gray-600 mt-0.5">{t.description}</div>}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                  <span className="pill">{labelStatus(t.status)}</span>
                  <span className={`pill ${priorityClass(t.priority)}`}>{t.priority}</span>
                  <span className="pill">Due {formatDate(t.dueDate)}</span>
                  <span className="pill">{t.assigneeName ? `@${t.assigneeName}` : "Unassigned"}</span>
                </div>
              </div>
              {canEditTask(t) && (
                <button
                  onClick={async () => {
                    if (confirm("Delete this task?")) {
                      await deleteTask(t.id);
                      refresh();
                    }
                  }}
                  className="text-xs text-gray-400 hover:text-red-600"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <NewTaskModal
        open={showNew}
        onClose={() => setShowNew(false)}
        members={members}
        onCreated={async () => {
          setShowNew(false);
          await refresh();
        }}
      />
    </div>
  );
}

function NewTaskModal({
  open,
  onClose,
  members,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  members: Member[];
  onCreated: () => Promise<void>;
}) {
  const { event } = useEvent();
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setBusy(true);
    try {
      const assignee = members.find((m) => m.userId === assigneeId);
      await createTask({
        eventId: event.id,
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assignee?.userId ?? null,
        assigneeName: assignee?.name ?? null,
        createdBy: user.uid,
        createdByName: profile.name,
      });
      setTitle(""); setDescription(""); setPriority("medium"); setDueDate(""); setAssigneeId("");
      await onCreated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New task">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label">Title</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book Airbnb" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Priority</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {TASK_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Due date</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Assignee</label>
          <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={busy || !title.trim()}>
            {busy ? "Adding…" : "Add task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function labelStatus(s: TaskStatus) {
  return TASK_STATUSES.find((x) => x.value === s)?.label ?? s;
}

function priorityClass(p: TaskPriority) {
  return p === "high" ? "bg-red-50 text-red-700" : p === "low" ? "bg-gray-100 text-gray-600" : "bg-amber-50 text-amber-700";
}
