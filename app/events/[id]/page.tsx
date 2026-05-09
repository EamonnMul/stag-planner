"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { subscribeActivity } from "@/lib/firestore/activity";
import { subscribeDestinations } from "@/lib/firestore/destinations";
import { subscribeIdeas } from "@/lib/firestore/ideas";
import { subscribeTasks } from "@/lib/firestore/tasks";
import { formatDateRange, formatRelative } from "@/lib/format";
import type { ActivityLogEntry, Destination, Idea, Task } from "@/lib/types";
import { useEvent } from "./event-context";

export default function DashboardPage() {
  const { event } = useEvent();
  const [destinations, setDestinations] = useState<Destination[] | null>(null);
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [activity, setActivity] = useState<ActivityLogEntry[] | null>(null);

  useEffect(() => subscribeDestinations(event.id, setDestinations), [event.id]);
  useEffect(() => subscribeIdeas(event.id, setIdeas), [event.id]);
  useEffect(() => subscribeTasks(event.id, setTasks), [event.id]);
  useEffect(() => subscribeActivity(event.id, 8, setActivity), [event.id]);

  const topDestinations = (destinations ?? []).slice(0, 3);
  const topIdeas = (ideas ?? []).slice(0, 3);
  const open = (tasks ?? []).filter((t) => t.status !== "done");
  const done = (tasks ?? []).filter((t) => t.status === "done");
  const total = (tasks ?? []).length;
  const pct = total === 0 ? 0 : Math.round((done.length / total) * 100);

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
        <Stat label="Destinations" value={destinations?.length ?? "…"} />
        <Stat label="Tasks done" value={`${done.length}/${total}`} sub={`${pct}% complete`} />
      </section>

      <section>
        <SectionHeader
          title="Top destinations"
          link={{ href: `/events/${event.id}/destinations`, label: "See all" }}
        />
        {destinations === null ? (
          <Spinner />
        ) : topDestinations.length === 0 ? (
          <Hint text="No destinations yet. Suggest one." />
        ) : (
          <ul className="space-y-2">
            {topDestinations.map((d, idx) => (
              <li key={d.id}>
                <Link href={`/events/${event.id}/destinations/${d.id}`} className="card flex items-center justify-between hover:border-brand-300 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-xl font-bold text-gray-300 w-6 text-center">{idx + 1}</div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {[d.city, d.country].filter(Boolean).join(", ")}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold pl-2">
                    {d.voteCount} {d.voteCount === 1 ? "vote" : "votes"}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeader
          title="Top ideas"
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
                  <div className="text-xs text-gray-500 uppercase tracking-wide">{i.category} · {i.createdByName}</div>
                </div>
                <div className="text-sm font-semibold pl-2">
                  {i.voteCount} {i.voteCount === 1 ? "vote" : "votes"}
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
                    {t.assigneeName ? `@${t.assigneeName}` : "Unassigned"} · {t.priority}
                  </div>
                </div>
                <span className="pill">{t.status === "in_progress" ? "In Progress" : "To Do"}</span>
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
