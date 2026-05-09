"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { adminFetch } from "@/lib/adminApi";
import type { AdminStats } from "@/lib/admin-types";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<AdminStats>("/api/admin/stats")
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!stats) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin overview</h1>
        <p className="text-sm text-gray-600">All signed-up users across every stag.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Total users" value={stats.total} />
        <Stat label="Verified" value={stats.verified} sub={`${pct(stats.verified, stats.total)}%`} />
        <Stat label="Unverified" value={stats.unverified} />
        <Stat label="Active" value={stats.active} />
        <Stat label="Disabled" value={stats.disabled} />
      </div>

      <section className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Recent signups</h2>
          <Link href="/admin/users" className="text-xs text-brand-700 hover:underline">All users →</Link>
        </div>
        {stats.recentSignups.length === 0 ? (
          <p className="text-sm text-gray-400">No users yet.</p>
        ) : (
          <ul className="divide-y">
            {stats.recentSignups.map((u) => (
              <li key={u.uid}>
                <Link
                  href={`/admin/users/${u.uid}`}
                  className="py-2 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded-md"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{u.email ?? "(no email)"}</div>
                    <div className="text-xs text-gray-500 font-mono truncate">{u.uid}</div>
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap pl-2">
                    {u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="card">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function pct(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 100);
}
