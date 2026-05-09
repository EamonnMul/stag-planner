"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { adminFetch } from "@/lib/adminApi";
import type { AdminUserRow, AdminUsersPage } from "@/lib/admin-types";

const PAGE_SIZE = 50;

export default function UsersPage() {
  const [page, setPage] = useState<AdminUsersPage | null>(null);
  const [history, setHistory] = useState<(string | null)[]>([null]); // page tokens stack
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  // Client-side filters for the loaded page.
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "yes" | "no">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [provider, setProvider] = useState<"all" | "password" | "google.com">("all");

  const load = async (pageToken: string | null, query: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/users", window.location.origin);
      url.searchParams.set("maxResults", String(PAGE_SIZE));
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      if (query) url.searchParams.set("search", query);
      const data = await adminFetch<AdminUsersPage>(url.pathname + url.search);
      setPage(data);
    } catch (err) {
      setError((err as Error).message);
      setPage({ users: [], nextPageToken: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(null, "");
  }, []);

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    setHistory([null]);
    setActiveSearch(search.trim());
    await load(null, search.trim());
  };

  const next = async () => {
    if (!page?.nextPageToken) return;
    setHistory((h) => [...h, page.nextPageToken]);
    await load(page.nextPageToken, activeSearch);
  };

  const prev = async () => {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    await load(newHistory[newHistory.length - 1] ?? null, activeSearch);
  };

  const filtered = useMemo(() => {
    if (!page) return [];
    return page.users.filter((u) => {
      if (verifiedFilter === "yes" && !u.emailVerified) return false;
      if (verifiedFilter === "no" && u.emailVerified) return false;
      if (statusFilter === "active" && u.disabled) return false;
      if (statusFilter === "disabled" && !u.disabled) return false;
      if (provider !== "all" && !u.providers.includes(provider)) return false;
      return true;
    });
  }, [page, verifiedFilter, statusFilter, provider]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <span className="text-sm text-gray-500">
          {page ? `${page.users.length} on this page` : ""}
        </span>
      </div>

      <form onSubmit={onSearch} className="flex gap-2">
        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or uid…"
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
        {activeSearch && (
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              setSearch("");
              setActiveSearch("");
              setHistory([null]);
              await load(null, "");
            }}
          >
            Clear
          </button>
        )}
      </form>

      <div className="grid grid-cols-3 gap-2">
        <select className="input" value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value as typeof verifiedFilter)}>
          <option value="all">Email: all</option>
          <option value="yes">Verified</option>
          <option value="no">Unverified</option>
        </select>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">Status: all</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        <select className="input" value={provider} onChange={(e) => setProvider(e.target.value as typeof provider)}>
          <option value="all">Provider: all</option>
          <option value="password">Email/Password</option>
          <option value="google.com">Google</option>
        </select>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      {!page ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">No users match these filters.</p>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b">
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2 hidden sm:table-cell">Provider</th>
                <th className="px-3 py-2 hidden md:table-cell">Created</th>
                <th className="px-3 py-2 hidden md:table-cell">Last login</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((u) => <UserRow key={u.uid} u={u} />)}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={prev}
          disabled={history.length <= 1 || loading || !!activeSearch}
          className="btn-secondary"
        >
          ← Previous
        </button>
        <button
          onClick={next}
          disabled={!page?.nextPageToken || loading || !!activeSearch}
          className="btn-secondary"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function UserRow({ u }: { u: AdminUserRow }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2">
        <Link href={`/admin/users/${u.uid}`} className="flex items-center gap-3 min-w-0">
          <Avatar name={u.displayName ?? u.email ?? "?"} url={u.photoURL} size={32} />
          <div className="min-w-0">
            <div className="font-medium truncate flex items-center gap-2">
              {u.displayName ?? u.email ?? "(no name)"}
              {u.isAdmin && <span className="pill bg-red-50 text-red-700 text-[10px]">Admin</span>}
            </div>
            <div className="text-xs text-gray-500 truncate">{u.email ?? "—"}</div>
            <div className="text-[10px] text-gray-400 font-mono truncate">{u.uid}</div>
          </div>
        </Link>
      </td>
      <td className="px-3 py-2 hidden sm:table-cell text-xs text-gray-600">
        {u.providers.length === 0 ? "—" : u.providers.map(humanProvider).join(", ")}
      </td>
      <td className="px-3 py-2 hidden md:table-cell text-xs text-gray-600">
        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
      </td>
      <td className="px-3 py-2 hidden md:table-cell text-xs text-gray-600">
        {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString() : "—"}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {u.disabled
            ? <span className="pill bg-gray-200 text-gray-700 text-[10px]">Disabled</span>
            : <span className="pill bg-green-50 text-green-700 text-[10px]">Active</span>}
          {u.emailVerified
            ? <span className="pill bg-blue-50 text-blue-700 text-[10px]">Verified</span>
            : <span className="pill bg-amber-50 text-amber-700 text-[10px]">Unverified</span>}
        </div>
      </td>
    </tr>
  );
}

function humanProvider(p: string): string {
  if (p === "password") return "Email";
  if (p === "google.com") return "Google";
  return p;
}
