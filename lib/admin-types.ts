/**
 * Shapes returned by /api/admin/* — kept on a separate file (no `server-only`
 * marker) so client components can import the types without dragging the
 * admin SDK into the bundle.
 */

export interface AdminUserRow {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  disabled: boolean;
  createdAt: string | null;     // ISO
  lastSignInAt: string | null;  // ISO
  providers: string[];
  isAdmin: boolean;
}

export interface AdminUsersPage {
  users: AdminUserRow[];
  nextPageToken: string | null;
}

export interface AdminUserDetail extends AdminUserRow {
  customClaims: Record<string, unknown>;
  events: { id: string; title: string; role: "organiser" | "member" }[];
  taskCount: number;
  ideaCount: number;
  destinationCount: number;
  commentCount: number;
}

export interface AdminStats {
  total: number;
  verified: number;
  unverified: number;
  active: number;
  disabled: number;
  recentSignups: { uid: string; email: string | null; createdAt: string | null }[];
}
