import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, INITIAL_ADMIN_EMAILS } from "@/lib/firebase-admin";
import { logAdminAction, requireAdmin } from "@/lib/auth-server";
import type { AdminUserRow, AdminUsersPage } from "@/lib/admin-types";

export const runtime = "nodejs";

/**
 * GET /api/admin/users?pageToken=...&maxResults=50&search=...
 *
 * Lists Firebase Auth users, paginated via Firebase's pageToken cursor.
 * If `search` is provided we try exact lookups by email and uid first
 * (efficient — single API call each); otherwise we paginate through all
 * users.
 *
 * Returns at most 1000 users per request (Firebase's hard cap).
 */
export async function GET(req: NextRequest) {
  const result = await requireAdmin(req);
  if ("error" in result) return result.error;

  const url = new URL(req.url);
  const pageToken = url.searchParams.get("pageToken") ?? undefined;
  const maxResults = clamp(Number(url.searchParams.get("maxResults") ?? 50), 1, 1000);
  const search = url.searchParams.get("search")?.trim() ?? "";

  if (search) {
    const matches = await searchUsers(search);
    const body: AdminUsersPage = { users: matches, nextPageToken: null };
    return NextResponse.json(body);
  }

  const list = await adminAuth.listUsers(maxResults, pageToken);
  const body: AdminUsersPage = {
    users: list.users.map(toRow),
    nextPageToken: list.pageToken ?? null,
  };
  await logAdminAction({
    performedBy: result.admin.uid,
    performedByName: result.admin.name,
    action: "users_listed",
    metadata: { count: body.users.length, hasSearch: !!search },
  });
  return NextResponse.json(body);
}

async function searchUsers(query: string): Promise<AdminUserRow[]> {
  const matches: AdminUserRow[] = [];
  // UID lookup
  try {
    const u = await adminAuth.getUser(query);
    matches.push(toRow(u));
  } catch { /* not a uid */ }
  // Email lookup
  if (query.includes("@")) {
    try {
      const u = await adminAuth.getUserByEmail(query.toLowerCase());
      if (!matches.some((m) => m.uid === u.uid)) matches.push(toRow(u));
    } catch { /* no match */ }
  }
  // Display name / partial email search would require listing all users.
  // Skip — UI also supports client-side filtering of the loaded page.
  return matches;
}

function toRow(u: import("firebase-admin/auth").UserRecord): AdminUserRow {
  const email = (u.email ?? "").toLowerCase();
  const claimAdmin = (u.customClaims as { admin?: boolean } | undefined)?.admin === true;
  const bootstrapAdmin = !!email && INITIAL_ADMIN_EMAILS.includes(email);
  return {
    uid: u.uid,
    email: u.email ?? null,
    emailVerified: u.emailVerified,
    displayName: u.displayName ?? null,
    photoURL: u.photoURL ?? null,
    disabled: u.disabled,
    createdAt: u.metadata.creationTime ?? null,
    lastSignInAt: u.metadata.lastSignInTime ?? null,
    providers: u.providerData.map((p) => p.providerId),
    isAdmin: claimAdmin || bootstrapAdmin,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
