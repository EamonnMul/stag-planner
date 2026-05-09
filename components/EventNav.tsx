"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Dashboard" },
  { href: "/ideas", label: "Ideas" },
  { href: "/tasks", label: "Tasks" },
  { href: "/members", label: "Members" },
  { href: "/settings", label: "Settings" },
];

export function EventNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/events/${eventId}`;

  return (
    <nav className="sticky bottom-0 sm:static z-20 border-t sm:border-t-0 sm:border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-2 sm:px-4">
        <div className="flex justify-between sm:justify-start sm:gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const href = `${base}${t.href}`;
            const active = t.href === "" ? pathname === base : pathname?.startsWith(href);
            return (
              <Link
                key={t.href}
                href={href}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold uppercase tracking-wide border-t-2 sm:border-t-0 sm:border-b-2 transition ${
                  active
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
