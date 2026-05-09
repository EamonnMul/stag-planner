"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useEvent } from "./event-context";
import { listIdeas } from "@/lib/firestore/ideas";
import { listTasks } from "@/lib/firestore/tasks";
import { listRecentActivity } from "@/lib/firestore/activity";
import { formatDateRange, formatRelative } from "@/lib/format";
import { Spinner } from "@/components/ui/Spinner";
import type { ActivityLogEntry, Idea, Task } from "@/lib/types";

export default function DashboardPage() {
  const { event } = useEvent();
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[] | null>(null);

  useEffect(() => {
    listIdeas(event.id).then(setIdeas);
    listTasks(event.id).then(setTasks);
    listRecentActivity(event.id, 8).then(setActivity).catch(() => setActivity([]));
  }, [event.id]);

  const topIdeas = (ideas ?? []).slice(0, 3);
  const open = (tasks ?? []).filter((t) => t.status !== "done");
  const done = (tasks ?? []).filter((t) => t.status === "done");
  const total = (tasks ?? []).length;
  const pct = total === 0 ? 0 : Math.round((done.length / total) * 100);

  return (
    <div className="space-y-6">
      <section className="card bg-gradient-to-br from-brand-600 to-red-700 text-white border-0">
        <div className="text-xs uppercase tracking-widest opacity-80 font-bold">Upcoming</div>
        <h1 className="text-2xl font-bold mt-1">{event.title}</h1>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide opacity-70">Location</div>
            <div className="font-medium">{event.location}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide opacity-70">Dates</div>
            <div className="font-medium">{formatDateRange(event.startDate, event.endDate)}</div>
          </div>
        </div>
        {event.description && <p className="text-sm opacity-90 mt-4">{event.description}</p>}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Members" value={event.memberIds.length} />
        <Stat label="Ideas" value={ideas?.length ?? "…"} />
        <Stat label="Tasks done" value={`${done.length}/${total}`} sub={`${pct}% complete`} />
      </section>

      <section>
        <SectionHeader
          title="Top voted ideas"
          link={{ href: `/events/${event.id}/ideas`, label: "See all" }}
        />
        {ideas === null ? (
          <Spinner />
        ) : topIdeas.length === 0 ? (
          <Hint text="No ideas pitched yet." />
        ) : (
          <ul className="space-y-2">
            {topIdeas.map((i) => (
              <li key={i.id} className="card flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{i.title}</div>
                  <div className="text-xs text-gray-500">{i.category} • by {i.createdByName}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{i.score >= 0 ? `+${i.score}` : i.score}</div>
                  <div className="text-xs text-gray-500">{i.upvotes} up / {i.downvotes} down</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader
          title="Outstanding tasks"
          link={{ href: `/events/${event.id}/tasks`, label: "See all" }}
        />
        {tasks === null ? (
          <Spinner />
        ) : open.length === 0 ? (
          <Hint text="Everything's done. Or nothing exists." />
        ) : (
          <ul className="space-y-2">
            {open.slice(0, 4).map((t) => (
              <li key={t.id} className="card flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.title}</div>
                  <div className="text-xs text-gray-500">
                    {t.assigneeName ? `@${t.assigneeName}` : "Unassigned"} • {t.priority}
                  </div>
                </div>
                <span className="pill">{labelFor(t.status)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <SectionHeader title="Completed" />
          <ul className="space-y-2">
            {done.slice(0, 3).map((t) => (
              <li key={t.id} className="card flex items-center justify-between opacity-70">
                <div className="font-medium line-through truncate">{t.title}</div>
                <span className="pill bg-green-100 text-green-700">Done</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionHeader title="Recent activity" />
        {activity === null ? (
          <Spinner />
        ) : activity.length === 0 ? (
          <Hint text="Nothing yet." />
        ) : (
          <ul className="card divide-y">
            {activity.map((a) => (
              <li key={a.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                <span className="text-sm text-gray-700 truncate">{a.message}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">{formatRelative(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
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

function SectionHeader({
  title,
  link,
}: {
  title: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between mb-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      {link && (
        <Link href={link.href} className="text-sm text-brand-700 hover:underline">
          {link.label} →
        </Link>
      )}
    </div>
  );
}

function Hint({ text }: { text: string }) {
  return <div className="card text-sm text-gray-500">{text}</div>;
}

function labelFor(s: Task["status"]) {
  return s === "todo" ? "To Do" : s === "in_progress" ? "In Progress" : "Done";
}
