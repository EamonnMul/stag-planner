"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import { adminFetch } from "@/lib/adminApi";

/**
 * /admin layout.
 *
 * Client-side gate is UX only — it hides the section from non-admins. The
 * real security lives in /api/admin/* which verifies the ID token + admin
 * claim/bootstrap email server-side on every request. We probe by making
 * a real authenticated call (`/api/admin/whoami` would be cleanest, but
 * /api/admin/stats is already a privileged endpoint we can use as the
 * gate). Failing fast keeps user data out of the browser entirely.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok" | "denied">("checking");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?redirect=/admin");
      return;
    }
    // Force-refresh the token first in case the user was just granted admin.
    adminFetch<{ total: number }>("/api/admin/stats", {}, true)
      .then(() => setState("ok"))
      .catch(() => setState("denied"));
  }, [user, loading, router]);

  if (loading || state === "checking") return <FullPageSpinner />;

  if (state === "denied") {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="text-5xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold">Access denied</h1>
          <p className="mt-2 text-sm text-gray-600">
            This area is restricted to admins. If you think this is wrong, ask an existing admin to grant you access.
          </p>
          <Link href="/events" className="btn-secondary mt-6 inline-flex">Back to events</Link>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <span className="pill bg-red-50 text-red-700 uppercase tracking-wide text-[10px]">Admin</span>
          <nav className="flex gap-1 text-sm">
            <AdminLink href="/admin" label="Dashboard" />
            <AdminLink href="/admin/users" label="Users" />
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}

function AdminLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-semibold uppercase tracking-wide text-xs"
    >
      {label}
    </Link>
  );
}
