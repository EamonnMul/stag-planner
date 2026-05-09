"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Empty } from "@/components/ui/Empty";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { TaskCard } from "@/components/TaskCard";
import { LabelEditor } from "@/components/LabelChips";
import { useAuth } from "@/lib/auth";
import { listMembers } from "@/lib/firestore/events";
import { createTask, deleteTask, subscribeTasks, updateTaskStatus } from "@/lib/firestore/tasks";
import { formatDate } from "@/lib/format";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  WORKSTREAMS,
  type Member,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type Workstream,
} from "@/lib/types";
import { useEvent } from "../event-context";

type SavedFilter =
  | "all"
  | "mine"
  | "overdue"
  | "due_soon"
  | "blocked"
  | "needs_decision"
  | "unassigned"
  | "high"
  | "completed"
  | "recent";

type View = "board" | "list";
type SortKey = "due" | "priority" | "assignee" | "status" | "created";

export default function TasksPage() {
  const { event, canWrite, isOrganiser } = useEvent();
  const { user, profile } = useAuth();

  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [view, setView] = useState<View>("board");
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SavedFilter>("all");
  const [workstream, setWorkstream] = useState<Workstream | "all">("all");
  const [assignee, setAssignee] = useState<string | "all" | "unassigned">("all");
  const [priority, setPriority] = useState<TaskPriority | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("due");

  useEffect(() => subscribeTasks(event.id, setTasks), [event.id]);
  useEffect(() => {
    listMembers(event.id).then(setMembers).catch(() => setMembers([]));
  }, [event.id]);

  const filtered = useMemo(() => applyFilters(tasks ?? [], {
    search, filter, workstream, assignee, priority, currentUserId: user?.uid ?? null,
  }), [tasks, search, filter, workstream, assignee, priority, user?.uid]);

  const sorted = useMemo(() => sortTasks(filtered, sortKey), [filtered, sortKey]);

  const total = (tasks ?? []).length;
  const done = (tasks ?? []).filter((t) => t.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const cycleStatus = async (task: Task, next: TaskStatus) => {
    if (!canWrite || !user || !profile) return;
    await updateTaskStatus({ eventId: event.id, taskId: task.id, status: next, actor: { id: user.uid, name: profile.name } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-gray-600">Plan, assign, ship.</p>
        </div>
        <div className="flex gap-2">
          <ViewToggle view={view} onChange={setView} />
          {canWrite && <button className="btn-primary" onClick={() => setShowNew(true)}>+ New task</button>}
        </div>
      </div>

      <ProgressCard done={done} total={total} pct={pct} />

      <SavedFilters value={filter} onChange={setFilter} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <input
          className="input"
          placeholder="Search title or description…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={workstream} onChange={(e) => setWorkstream(e.target.value as typeof workstream)}>
          <option value="all">All workstreams</option>
          {WORKSTREAMS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>
        <select className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="all">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
        </select>
        <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
          <option value="all">All priorities</option>
          {TASK_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {tasks === null ? (
        <Spinner />
      ) : sorted.length === 0 ? (
        total === 0 ? (
          <Empty
            title="No tasks yet"
            body={canWrite ? "Add the first one — booking, deposit, transport, etc." : "Members haven't added any tasks yet."}
            action={canWrite ? <button className="btn-primary" onClick={() => setShowNew(true)}>Add a task</button> : undefined}
          />
        ) : (
          <Empty title="Nothing matches" body="Try clearing some filters." />
        )
      ) : view === "board" ? (
        <BoardView tasks={sorted} eventId={event.id} canWrite={canWrite} onMove={cycleStatus} />
      ) : (
        <ListView
          tasks={sorted}
          eventId={event.id}
          sortKey={sortKey}
          onSortChange={setSortKey}
          onStatusChange={cycleStatus}
          canWrite={canWrite}
          isOrganiser={isOrganiser}
          currentUserId={user?.uid ?? null}
        />
      )}

      {showNew && (
        <NewTaskModal members={members} onClose={() => setShowNew(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filters / sort
// ---------------------------------------------------------------------------

function applyFilters(
  tasks: Task[],
  q: {
    search: string;
    filter: SavedFilter;
    workstream: Workstream | "all";
    assignee: string | "all" | "unassigned";
    priority: TaskPriority | "all";
    currentUserId: string | null;
  }
): Task[] {
  const now = new Date();
  const inOneWeek = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  const search = q.search.trim().toLowerCase();

  return tasks.filter((t) => {
    if (search && !`${t.title} ${t.description}`.toLowerCase().includes(search)) return false;
    if (q.workstream !== "all" && t.workstream !== q.workstream) return false;
    if (q.priority !== "all" && t.priority !== q.priority) return false;
    if (q.assignee === "unassigned" && t.assigneeId) return false;
    if (q.assignee !== "all" && q.assignee !== "unassigned" && t.assigneeId !== q.assignee) return false;

    switch (q.filter) {
      case "mine":
        return q.currentUserId ? t.assigneeId === q.currentUserId : true;
      case "overdue":
        return !!t.dueDate && t.dueDate.toDate() < now && t.status !== "done";
      case "due_soon":
        return !!t.dueDate && t.dueDate.toDate() <= inOneWeek && t.status !== "done";
      case "blocked":
        return t.status === "blocked";
      case "needs_decision":
        return t.status === "needs_decision";
      case "unassigned":
        return !t.assigneeId;
      case "high":
        return t.priority === "high" || t.priority === "critical";
      case "completed":
        return t.status === "done";
      case "recent":
      case "all":
      default:
        return true;
    }
  });
}

function sortTasks(tasks: Task[], key: SortKey): Task[] {
  const copy = tasks.slice();
  copy.sort((a, b) => {
    switch (key) {
      case "due": {
        const av = a.dueDate ? a.dueDate.toMillis() : Number.MAX_SAFE_INTEGER;
        const bv = b.dueDate ? b.dueDate.toMillis() : Number.MAX_SAFE_INTEGER;
        return av - bv;
      }
      case "priority": {
        const order: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      }
      case "assignee":
        return (a.assigneeName ?? "~").localeCompare(b.assigneeName ?? "~");
      case "status":
        return a.status.localeCompare(b.status);
      case "created":
      default:
        return (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);
    }
  });
  return copy;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden">
      {(["board", "list"] as View[]).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
            view === v ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

function ProgressCard({ done, total, pct }: { done: number; total: number; pct: number }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">{done}/{total} complete</div>
        <div className="text-sm font-semibold">{pct}%</div>
      </div>
      <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SavedFilters({
  value,
  onChange,
}: {
  value: SavedFilter;
  onChange: (v: SavedFilter) => void;
}) {
  const opts: { value: SavedFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "mine", label: "My tasks" },
    { value: "overdue", label: "Overdue" },
    { value: "due_soon", label: "Due soon" },
    { value: "blocked", label: "Blocked" },
    { value: "needs_decision", label: "Needs decision" },
    { value: "unassigned", label: "Unassigned" },
    { value: "high", label: "High priority" },
    { value: "completed", label: "Completed" },
  ];
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {opts.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
            value === o.value
              ? "bg-brand-600 text-white border-brand-600"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function BoardView({
  tasks,
  eventId,
  canWrite,
  onMove,
}: {
  tasks: Task[];
  eventId: string;
  canWrite: boolean;
  onMove: (task: Task, status: TaskStatus) => void;
}) {
  const grouped = TASK_STATUSES.map((s) => ({
    ...s,
    tasks: tasks.filter((t) => t.status === s.value),
  }));
  return (
    <div className="overflow-x-auto -mx-4 px-4 pb-2">
      <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3 min-w-full">
        {grouped.map((col) => (
          <div key={col.value} className="rounded-2xl bg-gray-50 border border-gray-200 p-3 flex flex-col gap-2 min-h-[200px]">
            <div className="flex items-center justify-between mb-1">
              <span className={`pill text-[11px] uppercase tracking-wide ${col.tone}`}>{col.label}</span>
              <span className="text-xs text-gray-400">{col.tasks.length}</span>
            </div>
            {col.tasks.length === 0 && (
              <div className="text-xs text-gray-400 px-2">—</div>
            )}
            {col.tasks.map((t) => (
              <div key={t.id} className="space-y-1">
                <TaskCard eventId={eventId} task={t} />
                {canWrite && (
                  <select
                    className="text-[11px] text-gray-500 px-2 py-1 rounded-md border bg-white w-full"
                    value={t.status}
                    onChange={(e) => onMove(t, e.target.value as TaskStatus)}
                    title="Change status"
                  >
                    {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>Move to {s.label}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListView({
  tasks,
  eventId,
  sortKey,
  onSortChange,
  onStatusChange,
  canWrite,
  isOrganiser,
  currentUserId,
}: {
  tasks: Task[];
  eventId: string;
  sortKey: SortKey;
  onSortChange: (k: SortKey) => void;
  onStatusChange: (task: Task, next: TaskStatus) => void;
  canWrite: boolean;
  isOrganiser: boolean;
  currentUserId: string | null;
}) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wide text-gray-500 border-b">
        Sort by:
        {(["due", "priority", "assignee", "status", "created"] as SortKey[]).map((k) => (
          <button
            key={k}
            onClick={() => onSortChange(k)}
            className={`text-xs px-2 py-1 rounded-md ${
              sortKey === k ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <ul className="divide-y">
        {tasks.map((t) => (
          <li key={t.id} className="px-3 py-2.5 flex items-center gap-3">
            <select
              className="text-[11px] px-2 py-1 rounded-md border bg-white"
              value={t.status}
              onChange={(e) => canWrite && onStatusChange(t, e.target.value as TaskStatus)}
              disabled={!canWrite}
            >
              {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            <Link href={`/events/${eventId}/tasks/${t.id}`} className="min-w-0 flex-1">
              <div className={`text-sm font-medium truncate ${t.status === "done" ? "line-through text-gray-400" : ""}`}>
                {t.title}
              </div>
              <div className="text-[11px] text-gray-500 truncate">
                {t.assigneeName ? `@${t.assigneeName}` : "Unassigned"}
                {" · "}
                {t.workstream.replace("_", " ")}
                {t.dueDate && ` · Due ${formatDate(t.dueDate)}`}
              </div>
            </Link>

            <span className="text-[11px] text-gray-500 capitalize hidden sm:inline">{t.priority}</span>
            {(t.assigneeId === currentUserId || t.createdBy === currentUserId || isOrganiser) && (
              <button
                onClick={async () => {
                  if (confirm("Delete this task?")) await deleteTask(eventId, t.id);
                }}
                className="text-xs text-gray-300 hover:text-red-500"
              >×</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewTaskModal({ members, onClose }: { members: Member[]; onClose: () => void }) {
  const { event } = useEvent();
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [workstream, setWorkstream] = useState<Workstream>("admin");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setBusy(true);
    try {
      const assignee = members.find((m) => m.userId === assigneeId);
      await createTask({
        eventId: event.id,
        title,
        description,
        workstream,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        assigneeId: assignee?.userId ?? null,
        assigneeName: assignee?.name ?? null,
        labels,
        blocker: null,
        createdBy: user.uid,
        createdByName: profile.name,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="New task">
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
            <label className="label">Workstream</label>
            <select className="input" value={workstream} onChange={(e) => setWorkstream(e.target.value as Workstream)}>
              {WORKSTREAMS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {TASK_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Due date</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Assignee</label>
            <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Labels</label>
          <LabelEditor value={labels} onChange={setLabels} />
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
