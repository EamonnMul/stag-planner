import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { logAdminAction, requireAdmin } from "@/lib/auth-server";

export const runtime = "nodejs";

/**
 * POST   /api/admin/users/{uid}/admin → grant admin claim
 * DELETE /api/admin/users/{uid}/admin → revoke admin claim
 *
 * Setting custom claims invalidates all existing ID tokens for that user
 * (forcing a refresh). Effects are visible after their next token refresh,
 * which the Firebase Web SDK does automatically within ~1 hour, or
 * immediately if they call `getIdToken(true)`.
 */
export async function POST(req: NextRequest, ctx: { params: { uid: string } }) {
  return setClaim(req, ctx.params.uid, true);
}

export async function DELETE(req: NextRequest, ctx: { params: { uid: string } }) {
  return setClaim(req, ctx.params.uid, false);
}

async function setClaim(req: NextRequest, uid: string, admin: boolean) {
  const result = await requireAdmin(req);
  if ("error" in result) return result.error;

  if (uid === result.admin.uid && !admin) {
    return NextResponse.json(
      { error: "Refusing to remove your own admin role. Get another admin to do it." },
      { status: 400 }
    );
  }

  let user;
  try {
    user = await adminAuth.getUser(uid);
  } catch (err) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const existing = (user.customClaims ?? {}) as Record<string, unknown>;
  const next = { ...existing };
  if (admin) next.admin = true;
  else delete next.admin;

  try {
    await adminAuth.setCustomUserClaims(uid, next);
    await adminAuth.revokeRefreshTokens(uid); // force re-auth so claim applies sooner
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: (err as Error).message }, { status: 400 });
  }

  await logAdminAction({
    performedBy: result.admin.uid,
    performedByName: result.admin.name,
    action: admin ? "admin_role_granted" : "admin_role_revoked",
    targetUserId: uid,
  });
  return NextResponse.json({ ok: true });
}
