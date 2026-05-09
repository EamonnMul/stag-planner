import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, INITIAL_ADMIN_EMAILS } from "@/lib/firebase-admin";
import { logAdminAction, requireAdmin } from "@/lib/auth-server";
import type { AdminUserDetail } from "@/lib/admin-types";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: { uid: string } }) {
  const result = await requireAdmin(req);
  if ("error" in result) return result.error;

  const { uid } = ctx.params;
  let user;
  try {
    user = await adminAuth.getUser(uid);
  } catch (err) {
    return NextResponse.json({ error: "User not found", detail: (err as Error).message }, { status: 404 });
  }

  // Per-entity counts via Firestore queries (server-side, bypasses rules).
  const [eventsSnap, tasksSnap, ideasSnap, destinationsSnap] = await Promise.all([
    adminDb.collection("stagEvents").where("memberIds", "array-contains", uid).get(),
    adminDb.collectionGroup("tasks").where("createdBy", "==", uid).get(),
    adminDb.collectionGroup("ideas").where("createdBy", "==", uid).get(),
    adminDb.collectionGroup("destinations").where("createdBy", "==", uid).get(),
  ]);

  // Comments count via collectionGroup.
  let commentCount = 0;
  try {
    const commentsSnap = await adminDb.collectionGroup("comments").where("userId", "==", uid).get();
    commentCount = commentsSnap.size;
  } catch (err) {
    // collectionGroup index may not exist yet — skip gracefully.
    console.warn("comments collectionGroup query failed", err);
  }

  const events = eventsSnap.docs.map((d) => {
    const data = d.data();
    const role: "organiser" | "member" = data.organiserId === uid ? "organiser" : "member";
    return { id: d.id, title: (data.title as string) ?? "(untitled)", role };
  });

  const email = (user.email ?? "").toLowerCase();
  const claimAdmin = (user.customClaims as { admin?: boolean } | undefined)?.admin === true;
  const bootstrapAdmin = !!email && INITIAL_ADMIN_EMAILS.includes(email);

  const body: AdminUserDetail = {
    uid: user.uid,
    email: user.email ?? null,
    emailVerified: user.emailVerified,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    disabled: user.disabled,
    createdAt: user.metadata.creationTime ?? null,
    lastSignInAt: user.metadata.lastSignInTime ?? null,
    providers: user.providerData.map((p) => p.providerId),
    isAdmin: claimAdmin || bootstrapAdmin,
    customClaims: (user.customClaims as Record<string, unknown> | undefined) ?? {},
    events,
    taskCount: tasksSnap.size,
    ideaCount: ideasSnap.size,
    destinationCount: destinationsSnap.size,
    commentCount,
  };

  await logAdminAction({
    performedBy: result.admin.uid,
    performedByName: result.admin.name,
    action: "user_viewed",
    targetUserId: uid,
  });

  return NextResponse.json(body);
}
