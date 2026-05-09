import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { requireAdmin } from "@/lib/auth-server";
import type { AdminStats } from "@/lib/admin-types";

export const runtime = "nodejs";

/**
 * Walks the Firebase Auth user list (cursor-paginated) and aggregates.
 * Capped at MAX_USERS to avoid runaway billing if an attacker breached
 * the admin gate; for our scale this is far more than enough.
 */
const MAX_USERS = 5000;

export async function GET(req: NextRequest) {
  const result = await requireAdmin(req);
  if ("error" in result) return result.error;

  let total = 0;
  let verified = 0;
  let unverified = 0;
  let active = 0;
  let disabled = 0;
  const recent: AdminStats["recentSignups"] = [];

  let pageToken: string | undefined;
  while (total < MAX_USERS) {
    const page = await adminAuth.listUsers(1000, pageToken);
    for (const u of page.users) {
      total++;
      if (u.emailVerified) verified++; else unverified++;
      if (u.disabled) disabled++; else active++;
      recent.push({
        uid: u.uid,
        email: u.email ?? null,
        createdAt: u.metadata.creationTime ?? null,
      });
    }
    if (!page.pageToken) break;
    pageToken = page.pageToken;
  }

  recent.sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });

  const body: AdminStats = {
    total,
    verified,
    unverified,
    active,
    disabled,
    recentSignups: recent.slice(0, 10),
  };
  return NextResponse.json(body);
}
