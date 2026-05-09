import { Timestamp } from "firebase/firestore";

export function formatDate(ts: Timestamp | null | undefined): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateRange(start: Timestamp, end: Timestamp): string {
  const s = start.toDate();
  const e = end.toDate();
  const sameYear = s.getFullYear() === e.getFullYear();
  const fmt: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${s.toLocaleDateString(undefined, fmt)} – ${e.toLocaleDateString(undefined, {
    ...fmt,
    year: sameYear ? undefined : "numeric",
  })} ${sameYear ? s.getFullYear() : ""}`.trim();
}

export function formatRelative(ts: Timestamp | null | undefined): string {
  if (!ts) return "";
  const diff = Date.now() - ts.toDate().getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return ts.toDate().toLocaleDateString();
}

export function formatCurrency(amount: number): string {
  if (!amount) return "Free";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
