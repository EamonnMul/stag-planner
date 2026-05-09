"use client";

import { getAuth } from "firebase/auth";

/**
 * Tiny fetch wrapper that pulls a fresh Firebase ID token and attaches it
 * to every admin request. Force-refresh is configurable — pass `true` after
 * an action you expect to change claims (e.g. you just granted yourself
 * admin) so the next call sees the new claim.
 */
export async function adminFetch<T>(
  path: string,
  init: RequestInit = {},
  forceRefresh = false
): Promise<T> {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken(forceRefresh);
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error ?? ""; } catch {}
    throw new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`);
  }
  return res.json() as Promise<T>;
}

/** Force the SDK to refresh the local ID token, picking up new custom claims. */
export async function refreshClaims(): Promise<void> {
  const user = getAuth().currentUser;
  if (!user) return;
  await user.getIdToken(true);
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = getAuth().currentUser;
  if (!user) return false;
  const token = await user.getIdTokenResult();
  return token.claims.admin === true;
}
