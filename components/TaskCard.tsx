"use client";

import Link from "next/link";
import { PriorityBadge, WorkstreamBadge } from "./Badges";
import { LabelChips } from "./LabelChips";
import { formatDate } from "@/lib/format";
import type { Task } from "@/lib/types";

export function TaskCard({ eventId, task }: { eventId: string; task: Task }) {
  const isDone = task.status === "done";
  const overdue = !isDone && task.dueDate && task.dueDate.toDate() < new Date();

  return (
    <Link
      href={`/events/${eventId}/tasks/${task.id}`}
      className={`block rounded-xl border bg-white p-3 hover:border-brand-300 transition ${
        isDone ? "opacity-60" : ""
      }`}
    >
      <div className={`text-sm font-semibold mb-2 ${isDone ? "line-through" : ""}`}>{task.title}</div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        <WorkstreamBadge workstream={task.workstream} />
        <PriorityBadge priority={task.priority} />
        {task.dueDate && (
          <span className={`pill text-[11px] ${overdue ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700"}`}>
            {overdue ? "Overdue " : "Due "}{formatDate(task.dueDate)}
          </span>
        )}
      </div>

      {task.labels && task.labels.length > 0 && (
        <div className="mb-2">
          <LabelChips labels={task.labels} />
        </div>
      )}

      {task.blocker && (
        <div className="text-[11px] text-red-600 mb-2 truncate">
          Blocked by: {task.blocker.title}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span className="truncate">{task.assigneeName ? `@${task.assigneeName}` : "Unassigned"}</span>
        <div className="flex items-center gap-2 shrink-0">
          {task.subtaskTotal > 0 && (
            <span title="Subtasks">{task.subtaskCompleted}/{task.subtaskTotal} ✓</span>
          )}
          {task.commentCount > 0 && (
            <span title="Comments">{task.commentCount} 💬</span>
          )}
        </div>
      </div>
    </Link>
  );
}
