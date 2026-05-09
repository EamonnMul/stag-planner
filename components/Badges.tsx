"use client";

import {
  DECISION_STATUSES,
  ITEM_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  WORKSTREAMS,
  type DecisionStatus,
  type ItemStatus,
  type TaskPriority,
  type TaskStatus,
  type Workstream,
} from "@/lib/types";

/**
 * A pill that doubles as an editable picker. If `onChange` is supplied it
 * renders a styled native <select>; otherwise a static badge. Native selects
 * are deliberate — they get free mobile UX and zero accessibility work.
 */
function pillClass(tone: string, interactive: boolean) {
  return `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${tone} ${
    interactive ? "cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-brand-300 transition" : ""
  }`;
}

export function TaskStatusBadge({
  status,
  onChange,
  disabled,
}: {
  status: TaskStatus;
  onChange?: (status: TaskStatus) => void;
  disabled?: boolean;
}) {
  const meta = TASK_STATUSES.find((s) => s.value === status) ?? TASK_STATUSES[0];
  if (!onChange || disabled) return <span className={pillClass(meta.tone, false)}>{meta.label}</span>;
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
      className={`${pillClass(meta.tone, true)} appearance-none border-0 outline-none pr-6 bg-no-repeat bg-right`}
      style={{ backgroundImage: caret() }}
    >
      {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  );
}

export function ItemStatusBadge({
  status,
  onChange,
  disabled,
}: {
  status: ItemStatus;
  onChange?: (status: ItemStatus) => void;
  disabled?: boolean;
}) {
  const meta = ITEM_STATUSES.find((s) => s.value === status) ?? ITEM_STATUSES[0];
  if (!onChange || disabled) return <span className={pillClass(meta.tone, false)}>{meta.label}</span>;
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as ItemStatus)}
      className={`${pillClass(meta.tone, true)} appearance-none border-0 outline-none pr-6 bg-no-repeat bg-right`}
      style={{ backgroundImage: caret() }}
    >
      {ITEM_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  );
}

export function DecisionStatusBadge({
  status,
  onChange,
  disabled,
}: {
  status: DecisionStatus;
  onChange?: (s: DecisionStatus) => void;
  disabled?: boolean;
}) {
  const meta = DECISION_STATUSES.find((s) => s.value === status) ?? DECISION_STATUSES[0];
  if (!onChange || disabled) return <span className={pillClass(meta.tone, false)}>{meta.label}</span>;
  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as DecisionStatus)}
      className={`${pillClass(meta.tone, true)} appearance-none border-0 outline-none pr-6 bg-no-repeat bg-right`}
      style={{ backgroundImage: caret() }}
    >
      {DECISION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
    </select>
  );
}

export function PriorityBadge({
  priority,
  onChange,
  disabled,
}: {
  priority: TaskPriority;
  onChange?: (p: TaskPriority) => void;
  disabled?: boolean;
}) {
  const meta = TASK_PRIORITIES.find((p) => p.value === priority) ?? TASK_PRIORITIES[0];
  if (!onChange || disabled) return <span className={pillClass(meta.tone, false)}>{meta.label}</span>;
  return (
    <select
      value={priority}
      onChange={(e) => onChange(e.target.value as TaskPriority)}
      className={`${pillClass(meta.tone, true)} appearance-none border-0 outline-none pr-6 bg-no-repeat bg-right`}
      style={{ backgroundImage: caret() }}
    >
      {TASK_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
    </select>
  );
}

export function WorkstreamBadge({
  workstream,
  onChange,
  disabled,
}: {
  workstream: Workstream;
  onChange?: (w: Workstream) => void;
  disabled?: boolean;
}) {
  const meta = WORKSTREAMS.find((w) => w.value === workstream) ?? WORKSTREAMS[WORKSTREAMS.length - 1];
  const tone = "bg-purple-50 text-purple-700";
  if (!onChange || disabled) return <span className={pillClass(tone, false)}>{meta.label}</span>;
  return (
    <select
      value={workstream}
      onChange={(e) => onChange(e.target.value as Workstream)}
      className={`${pillClass(tone, true)} appearance-none border-0 outline-none pr-6 bg-no-repeat bg-right`}
      style={{ backgroundImage: caret() }}
    >
      {WORKSTREAMS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
    </select>
  );
}

function caret() {
  return `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;
}
