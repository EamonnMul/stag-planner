"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import { adminFetch, refreshClaims } from "@/lib/adminApi";
import type { AdminUserDetail } from "@/lib/admin-types";

export default function UserDetailPage() {
  const params = useParams<{ uid: string }>();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!params?.uid) return;
    setError(null);
    try {
      const data = await adminFetch<AdminUserDetail>(`/api/admin/users/${params.uid}`);
      setUser(data);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => { load(); }, [params?.uid]);

  if (error) {
    return (
      <div>
        <p className="text-sm text-red-600">{error}</p>
        <Link href="/admin/users" className="btn-secondary mt-3 inline-flex">← All users</Link>
      </div>
    );
  }
  if (!user) return <Spinner />;

  const isSelf = currentUser?.uid === user.uid;

  const action = async (label: string, fn: () => Promise<unknown>) => {
    if (!confirm(`${label}?`)) return;
    setBusy(true);
    try {
      await fn();
      // Re-fetch to surface the new state.
      await load();
      // If the action changed the *current* user's claims, refresh client token.
      if (isSelf) await refreshClaims();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const grantAdmin = () => action("Grant admin role", () =>
    adminFetch(`/api/admin/users/${user.uid}/admin`, { method: "POST" })
  );
  const revokeAdmin = () => action("Revoke admin role", () =>
    adminFetch(`/api/admin/users/${user.uid}/admin`, { method: "DELETE" })
  );
  const disable = () => action("Disable this account", () =>
    adminFetch(`/api/admin/users/${user.uid}/disable`, { method: "POST" })
  );
  const enable = () => action("Re-enable this account", () =>
    adminFetch(`/api/admin/users/${user.uid}/enable`, { method: "POST" })
  );

  return (
    <div className="space-y-5">
      <Link href="/admin/users" className="text-sm text-gray-500 hover:underline">← All users</Link>

      <header className="card">
        <div className="flex items-center gap-4">
          <Avatar name={user.displayName ?? user.email ?? "?"} url={user.photoURL} size={64} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold truncate">{user.displayName ?? "(no name)"}</h1>
              {user.isAdmin && <span className="pill bg-red-50 text-red-700">Admin</span>}
              {user.disabled && <span className="pill bg-gray-200 text-gray-700">Disabled</span>}
              {!user.emailVerified && <span className="pill bg-amber-50 text-amber-700">Unverified</span>}
            </div>
            <div className="text-sm text-gray-600 mt-1 truncate">{user.email ?? "(no email)"}</div>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs text-gray-500 font-mono truncate">{user.uid}</code>
              <button
                onClick={() => navigator.clipboard?.writeText(user.uid)}
                className="text-xs text-gray-400 hover:text-gray-700"
              >
                Copy uid
              </button>
              {user.email && (
                <button
                  onClick={() => navigator.clipboard?.writeText(user.email!)}
                  className="text-xs text-gray-400 hover:text-gray-700"
                >
                  Copy email
                </button>
              )}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-sm">
          <Field label="Created">{user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}</Field>
          <Field label="Last sign-in">{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : "—"}</Field>
          <Field label="Email verified">{user.emailVerified ? "Yes" : "No"}</Field>
          <Field label="Providers">{user.providers.length === 0 ? "—" : user.providers.map(humanProvider).join(", ")}</Field>
        </dl>

        <div className="mt-5 pt-5 border-t flex flex-wrap gap-2">
          {!user.isAdmin && (
            <button onClick={grantAdmin} disabled={busy} className="btn-primary text-xs px-3 py-1.5">Make admin</button>
          )}
          {user.isAdmin && !isSelf && (
            <button onClick={revokeAdmin} disabled={busy} className="btn-danger text-xs px-3 py-1.5">Remove admin</button>
          )}
          {!user.disabled && !isSelf && (
            <button onClick={disable} disabled={busy} className="btn-danger text-xs px-3 py-1.5">Disable account</button>
          )}
          {user.disabled && (
            <button onClick={enable} disabled={busy} className="btn-secondary text-xs px-3 py-1.5">Re-enable</button>
          )}
          {isSelf && (
            <span className="text-xs text-gray-500 self-center">
              You can't disable yourself or revoke your own admin from here.
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="card">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">
            Stag events ({user.events.length})
          </h3>
          {user.events.length === 0 ? (
            <p className="text-sm text-gray-400">Not a member of any.</p>
          ) : (
            <ul className="divide-y">
              {user.events.map((e) => (
                <li key={e.id}>
                  <Link href={`/events/${e.id}`} className="py-2 flex items-center justify-between hover:bg-gray-50 -mx-2 px-2 rounded-md">
                    <span className="font-medium text-sm truncate">{e.title}</span>
                    <span className="pill bg-gray-100 text-gray-600 text-[10px]">{e.role}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Activity</h3>
          <dl className="space-y-1 text-sm">
            <Inline label="Tasks created" value={user.taskCount} />
            <Inline label="Ideas pitched" value={user.ideaCount} />
            <Inline label="Destinations suggested" value={user.destinationCount} />
            <Inline label="Comments posted" value={user.commentCount} />
          </dl>
        </section>
      </div>

      <section className="card">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">Custom claims</h3>
        <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-x-auto">
{JSON.stringify(user.customClaims, null, 2)}
        </pre>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="font-medium truncate">{children}</dd>
    </div>
  );
}

function Inline({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-600">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function humanProvider(p: string): string {
  if (p === "password") return "Email";
  if (p === "google.com") return "Google";
  return p;
}
