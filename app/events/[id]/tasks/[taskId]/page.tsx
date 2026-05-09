"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PriorityBadge,
  TaskStatusBadge,
  WorkstreamBadge,
} from "@/components/Badges";
import { CommentsSection } from "@/components/CommentsSection";
import { LabelEditor } from "@/components/LabelChips";
import { Subtasks } from "@/components/Subtasks";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import { subscribeActivityForEntity } from "@/lib/firestore/activity";
import { subscribeDecisions } from "@/lib/firestore/decisions";
import { listMembers } from "@/lib/firestore/events";
import { taskPath } from "@/lib/firestore/paths";
import { deleteTask, subscribeTask, subscribeTasks, updateTask, updateTaskStatus } from "@/lib/firestore/tasks";
import { formatDate, formatRelative } from "@/lib/format";
import type {
  ActivityLogEntry,
  Blocker,
  Decision,
  Member,
  Task,
  TaskPriority,
  TaskStatus,
  Workstream,
} from "@/lib/types";
import { useEvent } from "../../event-context";

export default function TaskDetailPage() {
  const params = useParams<{ taskId: string }>();
  const router = useRouter();
  const { event, canWrite, isOrganiser } = useEvent();
  const { user, profile } = useAuth();

  const [task, setTask] = useState<Task | null | undefined>(undefined);
  const [members, setMembers] = useState<Member[]>([]);
  const [otherTasks, setOtherTasks] = useState<Task[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);

  useEffect(() => {
    if (!params?.taskId) return;
    return subscribeTask(event.id, params.taskId, setTask);
  }, [event.id, params?.taskId]);

  useEffect(() => subscribeTasks(event.id, setOtherTasks), [event.id]);
  useEffect(() => subscribeDecisions(event.id, setDecisions), [event.id]);
  useEffect(() => {
    if (!params?.taskId) return;
    return subscribeActivityForEntity(event.id, "task", params.taskId, setActivity);
  }, [event.id, params?.taskId]);
  useEffect(() => {
    listMembers(event.id).then(setMembers).catch(() => setMembers([]));
  }, [event.id]);

  if (task === undefined) return <FullPageSpinner />;
  if (task === null) {
    return (
      <div>
        <p className="text-sm text-gray-600">Task not found.</p>
        <Link href={`/events/${event.id}/tasks`} className="btn-secondary mt-3 inline-flex">← Back</Link>
      </div>
    );
  }

  const actor = user && profile ? { id: user.uid, name: profile.name } : null;
  const itemPath = taskPath(event.id, task.id);
  const canEdit = canWrite && !!actor;
  const canDelete = canEdit && (isOrganiser || user?.uid === task.createdBy || user?.uid === task.assigneeId);

  const onStatus = (s: TaskStatus) => {
    if (!actor) return;
    updateTaskStatus({ eventId: event.id, taskId: task.id, status: s, actor });
  };
  const patch = (p: Parameters<typeof updateTask>[0]["patch"]) => {
    if (!actor) return;
    updateTask({ eventId: event.id, taskId: task.id, patch: p, actor });
  };

  return (
    <div className="space-y-5">
      <Link href={`/events/${event.id}/tasks`} className="text-sm text-gray-500 hover:underline">
        ← All tasks
      </Link>

      <header className="card">
        <div className="flex items-start justify-between gap-3">
          {canEdit ? (
            <input
              className="input text-xl font-bold border-0 bg-transparent shadow-none -mx-3 px-3 py-1 hover:bg-gray-50 focus:bg-white"
              defaultValue={task.title}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== task.title) patch({ title: v });
              }}
            />
          ) : (
            <h1 className="text-xl font-bold">{task.title}</h1>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <TaskStatusBadge status={task.status} onChange={canEdit ? onStatus : undefined} />
          <PriorityBadge priority={task.priority} onChange={canEdit ? (p) => patch({ priority: p }) : undefined} />
          <WorkstreamBadge workstream={task.workstream} onChange={canEdit ? (w) => patch({ workstream: w }) : undefined} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Assignee</div>
            {canEdit ? (
              <select
                className="input mt-1"
                value={task.assigneeId ?? ""}
                onChange={(e) => {
                  const m = members.find((x) => x.userId === e.target.value);
                  patch({ assigneeId: m?.userId ?? null, assigneeName: m?.name ?? null });
                }}
              >
                <option value="">Unassigned</option>
                {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
              </select>
            ) : (
              <div className="font-medium">{task.assigneeName ?? "Unassigned"}</div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Due date</div>
            {canEdit ? (
              <input
                type="date"
                className="input mt-1"
                value={task.dueDate ? task.dueDate.toDate().toISOString().slice(0, 10) : ""}
                onChange={(e) => patch({ dueDate: e.target.value ? new Date(e.target.value) : null })}
              />
            ) : (
              <div className="font-medium">{formatDate(task.dueDate)}</div>
            )}
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">Created</div>
            <div className="font-medium">{formatRelative(task.createdAt)}</div>
            <div className="text-xs text-gray-400">by {task.createdByName}</div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400">{task.completedAt ? "Completed" : "Last update"}</div>
            <div className="font-medium">
              {task.completedAt ? formatRelative(task.completedAt) : formatRelative(task.updatedAt)}
            </div>
            {task.completedByName && <div className="text-xs text-gray-400">by {task.completedByName}</div>}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Description</div>
          {canEdit ? (
            <textarea
              className="input min-h-[80px]"
              defaultValue={task.description}
              onBlur={(e) => {
                if (e.target.value !== task.description) patch({ description: e.target.value });
              }}
            />
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.description || "—"}</p>
          )}
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Labels</div>
          <LabelEditor value={task.labels ?? []} onChange={(next) => patch({ labels: next })} disabled={!canEdit} />
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Blocked by</div>
          <BlockerEditor
            blocker={task.blocker}
            otherTasks={otherTasks.filter((t) => t.id !== task.id)}
            decisions={decisions}
            disabled={!canEdit}
            onChange={(next) => patch({ blocker: next })}
          />
        </div>

        {canDelete && (
          <div className="mt-5 pt-4 border-t flex justify-end">
            <button
              onClick={async () => {
                if (confirm(`Delete "${task.title}"?`)) {
                  await deleteTask(event.id, task.id);
                  router.push(`/events/${event.id}/tasks`);
                }
              }}
              className="text-xs text-gray-400 hover:text-red-600"
            >
              Delete task
            </button>
          </div>
        )}
      </header>

      <div className="card">
        <Subtasks eventId={event.id} taskId={task.id} canWrite={canEdit} />
      </div>

      <div className="card">
        <CommentsSection itemPath={itemPath} canWrite={canEdit} />
      </div>

      <div className="card">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Activity</h3>
        {activity.length === 0 ? (
          <p className="text-sm text-gray-400">Nothing yet.</p>
        ) : (
          <ul className="space-y-2">
            {activity.map((a) => (
              <li key={a.id} className="flex justify-between gap-2 text-sm">
                <span className="text-gray-700 truncate">{a.message}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{formatRelative(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BlockerEditor({
  blocker,
  otherTasks,
  decisions,
  disabled,
  onChange,
}: {
  blocker: Blocker | null;
  otherTasks: Task[];
  decisions: Decision[];
  disabled?: boolean;
  onChange: (next: Blocker | null) => void;
}) {
  const value = blocker ? `${blocker.kind}:${blocker.id}` : "";

  if (disabled) {
    return blocker ? (
      <div className="text-sm">
        <span className="pill bg-red-50 text-red-700 mr-2">{blocker.kind}</span>
        {blocker.title}
      </div>
    ) : <div className="text-sm text-gray-400">Not blocked.</div>;
  }

  return (
    <select
      className="input"
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) return onChange(null);
        const [kind, id] = v.split(":");
        if (kind === "task") {
          const t = otherTasks.find((x) => x.id === id);
          if (t) onChange({ kind: "task", id, title: t.title });
        } else if (kind === "decision") {
          const d = decisions.find((x) => x.id === id);
          if (d) onChange({ kind: "decision", id, title: d.title });
        }
      }}
    >
      <option value="">Not blocked</option>
      {otherTasks.length > 0 && (
        <optgroup label="Tasks">
          {otherTasks.map((t) => <option key={t.id} value={`task:${t.id}`}>{t.title}</option>)}
        </optgroup>
      )}
      {decisions.length > 0 && (
        <optgroup label="Decisions">
          {decisions.map((d) => <option key={d.id} value={`decision:${d.id}`}>{d.title}</option>)}
        </optgroup>
      )}
    </select>
  );
}
