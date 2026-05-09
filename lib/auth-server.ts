import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, INITIAL_ADMIN_EMAILS } from "./firebase-admin";

export interface AuthedAdmin {
  uid: string;
  email: string | null;
  name: string;
  /** True if claim is set; bootstrap-admins also pass requireAdmin even without the claim. */
  hasAdminClaim: boolean;
}

/**
 * Verify the caller's ID token AND that they are an admin.
 *
 * Two paths to admin:
 *   1. Custom claim `admin: true` on their Firebase Auth user
 *   2. Their email is in INITIAL_ADMIN_EMAILS (server-only env var)
 *
 * Path 2 is the bootstrap mechanism: a fresh deploy has zero admins, so the
 * very first authorised email logs in via the env var. Once they grant
 * themselves the claim through the admin UI, the env var is no longer needed
 * and can be removed.
 *
 * On failure returns the appropriate NextResponse — caller should return it.
 */
export async function requireAdmin(
  req: NextRequest
): Promise<{ admin: AuthedAdmin } | { error: NextResponse }> {
  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer (.+)$/);
  if (!match) {
    return { error: NextResponse.json({ error: "Missing bearer token" }, { status: 401 }) };
  }
  const token = match[1];

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token, true);
  } catch (err) {
    return { error: NextResponse.json({ error: "Invalid token", detail: (err as Error).message }, { status: 401 }) };
  }

  const email = (decoded.email ?? "").toLowerCase();
  const hasAdminClaim = decoded.admin === true;
  const isBootstrapAdmin = email && INITIAL_ADMIN_EMAILS.includes(email);

  if (!hasAdminClaim && !isBootstrapAdmin) {
    return {
      error: NextResponse.json({ error: "Not an admin" }, { status: 403 }),
    };
  }

  return {
    admin: {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string) ?? decoded.email ?? "Admin",
      hasAdminClaim,
    },
  };
}

/**
 * Append a row to the adminActivityLog. Best-effort — never throws into the
 * caller flow. Server-side only writes; clients never touch this collection.
 */
export async function logAdminAction(args: {
  performedBy: string;
  performedByName: string;
  action: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
}) {
  const { performedBy, performedByName, action, targetUserId, metadata } = args;
  try {
    await adminDb.collection("adminActivityLog").add({
      action,
      performedBy,
      performedByName,
      targetUserId: targetUserId ?? null,
      metadata: metadata ?? {},
      performedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("admin log write failed", err);
  }
}
