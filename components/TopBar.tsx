"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./ui/Avatar";

export function TopBar({ title }: { title?: string }) {
  const { profile, isAdmin, logOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-4 py-3">
        <Link href="/events" className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm">
          <span className="inline-block h-6 w-6 rounded bg-brand-600 text-white text-xs flex items-center justify-center">SP</span>
          <span className="hidden sm:inline">Stag Planner</span>
        </Link>
        {title && <div className="text-sm font-medium text-gray-700 truncate max-w-[50%]">{title}</div>}
        <div className="relative">
          <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2">
            <Avatar name={profile?.name ?? "User"} url={profile?.avatarUrl} size={32} />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-white shadow-lg py-1">
              <div className="px-3 py-2 text-xs text-gray-500 truncate">{profile?.email}</div>
              <Link href="/events" className="block px-3 py-2 text-sm hover:bg-gray-50" onClick={() => setOpen(false)}>
                My events
              </Link>
              {isAdmin && (
                <Link href="/admin" className="block px-3 py-2 text-sm hover:bg-gray-50 text-red-700 font-semibold" onClick={() => setOpen(false)}>
                  Admin
                </Link>
              )}
              <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
