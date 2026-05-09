"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/events");
  }, [user, loading, router]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <div className="mx-auto max-w-3xl px-6 pt-20 pb-12">
        <div className="text-center">
          <div className="inline-block px-3 py-1 rounded bg-brand-600 text-white text-xs font-bold uppercase tracking-widest mb-4">
            Stag Planner
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
            Plan it. Vote on it. Send it.
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
            Pitch ideas, vote on the plan, and split up the tasks. Built for chaotic group chats.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary">Get started</Link>
            <Link href="/login" className="btn-secondary">Log in</Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            { title: "Pitch ideas", body: "Destinations, activities, dinners. Everyone chips in." },
            { title: "Vote together", body: "Up or down. Most votes wins." },
            { title: "Split tasks", body: "Assign deposits, bookings, and travel admin." },
          ].map((f) => (
            <div key={f.title} className="card">
              <div className="font-semibold text-gray-900 uppercase tracking-wide text-sm">{f.title}</div>
              <div className="text-sm text-gray-600 mt-1">{f.body}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
