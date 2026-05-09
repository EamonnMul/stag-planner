"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { EventNav } from "@/components/EventNav";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import { joinPublicEvent, subscribeEvent } from "@/lib/firestore/events";
import { EventProvider } from "./event-context";
import type { StagEvent } from "@/lib/types";

export default function EventLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [event, setEvent] = useState<StagEvent | null | undefined>(undefined);
  const [joining, setJoining] = useState(false);

  // Live event subscription. We rely on Firestore rules for read access —
  // public events return data, private events return a permission error which
  // we surface as "not found" to the viewer.
  useEffect(() => {
    if (!params?.id) return;
    return subscribeEvent(params.id, (e) => setEvent(e));
  }, [params?.id]);

  if (loading || event === undefined) return <FullPageSpinner />;

  if (event === null) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-xl font-bold">Event not found</h1>
          <p className="mt-2 text-sm text-gray-600">
            It may be private, or the link is wrong.
          </p>
          <Link href="/events" className="btn-secondary mt-4 inline-flex">Back to events</Link>
        </main>
      </>
    );
  }

  const isMember = !!user && event.memberIds.includes(user.uid);
  const isPublicViewer = !isMember && event.visibility === "public";
  const canWrite = isMember;
  const isOrganiser = !!user && event.organiserId === user.uid;

  // Private event + not a member: kick them out.
  if (event.visibility === "private" && !isMember) {
    if (!user) {
      router.replace(`/login?redirect=/events/${event.id}`);
      return <FullPageSpinner />;
    }
    router.replace("/events");
    return <FullPageSpinner />;
  }

  const handleJoin = async () => {
    if (!user || !profile) {
      router.push(`/signup?redirect=/events/${event.id}`);
      return;
    }
    setJoining(true);
    try {
      await joinPublicEvent(event.id, {
        uid: user.uid,
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl ?? null,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setJoining(false);
    }
  };

  return (
    <EventProvider value={{ event, isMember, canWrite, isOrganiser, isPublicViewer }}>
      <TopBar title={event.title} />

      {isPublicViewer && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="mx-auto max-w-5xl px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
            <div className="text-amber-900">
              {user
                ? "You're viewing this stag in read-only mode. Join to vote, comment, and add ideas."
                : "Read-only public view. Sign in to vote and contribute."}
            </div>
            {user ? (
              <button onClick={handleJoin} disabled={joining} className="btn-primary text-xs px-3 py-1.5">
                {joining ? "Joining…" : "Join stag"}
              </button>
            ) : (
              <Link href={`/login?redirect=/events/${event.id}`} className="btn-primary text-xs px-3 py-1.5">
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}

      <EventNav eventId={event.id} />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:pb-6">{children}</main>
    </EventProvider>
  );
}
