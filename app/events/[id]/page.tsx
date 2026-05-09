"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DecisionStatusBadge, ItemStatusBadge, PriorityBadge, TaskStatusBadge } from "@/components/Badges";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import { subscribeActivity } from "@/lib/firestore/activity";
import { subscribeDecisions } from "@/lib/firestore/decisions";
import { subscribeDestinations } from "@/lib/firestore/destinations";
import { subscribeIdeas } from "@/lib/firestore/ideas";
import { subscribeTasks } from "@/lib/firestore/tasks";
import { formatDate, formatDateRange, formatRelative } from "@/lib/format";
import {
  WORKSTREAMS,
  type ActivityLogEntry,
  type Decision,
  type Destination,
  type Idea,
  type Task,
  type Workstream,
} from "@/lib/types";
import { useEvent } from "./event-context";

export default function DashboardPage() {
  const { event } = useEvent();
  const { user } = useAuth();

  const [destinations, setDestinations] = useState<Destination[] | null>(null);
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [decisions, setDecisions] = useState<Decision[] | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[] | null>(null);

  useEffect(() => subscribeDestinations(event.id, setDestinations), [event.id]);
  useEffect(() => subscribeIdeas(event.id, setIdeas), [event.id]);
  useEffect(() => subscribeTasks(event.id, setTasks), [event.id]);
  useEffect(() => subscribeDecisions(event.id, setDecisions), [event.id]);
  useEffect(() => subscribeActivity(event.id, 8, setActivity), [event.id]);

  const now = new Date();

  const shortlisted = (destinations ?? []).filter((d) => d.status === "shortlisted" || d.status === "chosen");
  const topVoted = (destinations ?? []).slice(0, 3);

  const myTasks = (tasks ?? []).filter((t) => t.assigneeId === user?.uid && t.status !== "done");
  const overdueTasks = (tasks ?? []).filter((t) => t.dueDate && t.dueDate.toDate() < now && t.status !== "done");
  const blockedTasks = (tasks ?? []).filter((t) => t.status === "blocked");
  const decisionTasks = (tasks ?? []).filter((t) => t.status === "needs_decision");
  const openDecisions = (decisions ?? []).filter((d) => d.status === "open");

  const total = (tasks ?? []).length;
  const done = (tasks ?? []).filter((t) => t.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const byWorkstream = useMemo(() => groupByWorkstream(tasks ?? []), [tasks]);

  return (
    <div className="space-y-6">
      <section className="card bg-gradient-to-br from-brand-600 to-red-700 text-white border-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest opacity-80 font-bold">Upcoming</div>
            <h1 className="text-2xl font-bold mt-1">{event.title}</h1>
          </div>
          <span className="pill bg-white/20 text-white border-0 backdrop-blur uppercase tracking-wide text-[10px]">
            {event.visibility}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide opacity-70">Location</div>
            <div className="font-medium">{event.location || "TBD"}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide opacity-70">Dates</div>
            <div className="font-medium">{formatDateRange(event.startDate, event.endDate)}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label="Members" value={event.memberIds.length} />
        <Stat label="Open tasks" value={total - done} sub={`${pct}% complete`} />
        <Stat label="Open decisions" value={openDecisions.length} />
        <Stat label="Destinations" value={destinations?.length ?? "…"} />
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <SectionCard
          title="Top voted destinations"
          link={{ href: `/events/${event.id}/destinations`, label: "All" }}
        >
          {destinations === null ? (
            <Spinner />
          ) : topVoted.length === 0 ? (
            <Hint text="No destinations yet." />
          ) : (
            <ul className="space-y-2">
              {topVoted.map((d, idx) => (
                <li key={d.id}>
                  <Link href={`/events/${event.id}/destinations/${d.id}`} className="flex items-center justify-between gap-2 hover:underline">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-gray-300 w-5 text-center">{idx + 1}</span>
                      <span className="font-medium truncate">{d.name}</span>
                      <ItemStatusBadge status={d.status} />
                    </div>
                    <span className="text-sm font-semibold shrink-0">{d.voteCount} {d.voteCount === 1 ? "vote" : "votes"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Shortlisted">
          {destinations === null ? (
            <Spinner />
          ) : shortlisted.length === 0 ? (
            <Hint text="Nothing shortlisted yet." />
          ) : (
            <ul className="space-y-2">
              {shortlisted.map((d) => (
                <li key={d.id}>
                  <Link href={`/events/${event.id}/destinations/${d.id}`} className="flex items-center justify-between gap-2 hover:underline">
                    <span className="font-medium truncate">{d.name}</span>
                    <ItemStatusBadge status={d.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Decisions needing a call"
          link={{ href: `/events/${event.id}/decisions`, label: "All" }}
        >
          {decisions === null ? (
            <Spinner />
          ) : openDecisions.length === 0 ? (
            <Hint text="Nothing open." />
          ) : (
            <ul className="space-y-2">
              {openDecisions.slice(0, 4).map((d) => {
                const overdue = d.dueDate && d.dueDate.toDate() < now;
                return (
                  <li key={d.id}>
                    <Link href={`/events/${event.id}/decisions/${d.id}`} className="flex items-center justify-between gap-2 hover:underline">
                      <span className="font-medium truncate">{d.title}</span>
                      <span className={`text-xs whitespace-nowrap ${overdue ? "text-red-700 font-semibold" : "text-gray-500"}`}>
                        {d.dueDate ? (overdue ? "Overdue " : "Due ") + formatDate(d.dueDate) : "No due date"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Tasks assigned to you"
          link={{ href: `/events/${event.id}/tasks`, label: "All" }}
        >
          {tasks === null ? (
            <Spinner />
          ) : !user ? (
            <Hint text="Sign in to see your tasks." />
          ) : myTasks.length === 0 ? (
            <Hint text="Nothing on your plate." />
          ) : (
            <ul className="space-y-2">
              {myTasks.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <Link href={`/events/${event.id}/tasks/${t.id}`} className="flex items-center justify-between gap-2 hover:underline">
                    <span className="font-medium truncate">{t.title}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <PriorityBadge priority={t.priority} />
                      <TaskStatusBadge status={t.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Overdue">
          {tasks === null ? (
            <Spinner />
          ) : overdueTasks.length === 0 ? (
            <Hint text="Nothing overdue." />
          ) : (
            <ul className="space-y-2">
              {overdueTasks.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <Link href={`/events/${event.id}/tasks/${t.id}`} className="flex items-center justify-between gap-2 hover:underline">
                    <span className="font-medium truncate">{t.title}</span>
                    <span className="text-xs text-red-700 whitespace-nowrap">{formatDate(t.dueDate)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Blocked">
          {tasks === null ? (
            <Spinner />
          ) : blockedTasks.length === 0 ? (
            <Hint text="Nothing blocked." />
          ) : (
            <ul className="space-y-2">
              {blockedTasks.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <Link href={`/events/${event.id}/tasks/${t.id}`} className="flex flex-col hover:underline">
                    <span className="font-medium truncate">{t.title}</span>
                    {t.blocker && (
                      <span className="text-xs text-gray-500 truncate">Blocked by: {t.blocker.title}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Progress by workstream">
        {tasks === null ? (
          <Spinner />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {byWorkstream.map(({ workstream, total, done }) => (
              <div key={workstream}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{labelForWorkstream(workstream)}</span>
                  <span className="text-gray-500">{done}/{total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-brand-500"
                    style={{ width: total === 0 ? "0%" : `${Math.round((done / total) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent activity">
        {activity === null ? (
          <Spinner />
        ) : activity.length === 0 ? (
          <Hint text="Nothing yet." />
        ) : (
          <ul className="divide-y">
            {activity.map((a) => (
              <li key={a.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                <span className="text-sm text-gray-700 truncate">{a.message}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{formatRelative(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="card">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function SectionCard({
  title,
  link,
  children,
}: {
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <div className="flex items-end justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h2>
        {link && (
          <Link href={link.href} className="text-xs text-brand-700 hover:underline">{link.label} →</Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Hint({ text }: { text: string }) {
  return <div className="text-sm text-gray-500">{text}</div>;
}

function groupByWorkstream(tasks: Task[]): { workstream: Workstream; total: number; done: number }[] {
  return WORKSTREAMS.map((w) => {
    const list = tasks.filter((t) => t.workstream === w.value);
    return { workstream: w.value, total: list.length, done: list.filter((t) => t.status === "done").length };
  });
}

function labelForWorkstream(w: Workstream) {
  return WORKSTREAMS.find((x) => x.value === w)?.label ?? w;
}
