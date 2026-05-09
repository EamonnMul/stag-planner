import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { logAdminAction, requireAdmin } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: { uid: string } }) {
  const result = await requireAdmin(req);
  if ("error" in result) return result.error;

  const { uid } = ctx.params;
  if (uid === result.admin.uid) {
    return NextResponse.json({ error: "Refusing to disable yourself" }, { status: 400 });
  }

  try {
    await adminAuth.updateUser(uid, { disabled: true });
  } catch (err) {
    return NextResponse.json({ error: "Update failed", detail: (err as Error).message }, { status: 400 });
  }

  await logAdminAction({
    performedBy: result.admin.uid,
    performedByName: result.admin.name,
    action: "user_disabled",
    targetUserId: uid,
  });
  return NextResponse.json({ ok: true });
}
