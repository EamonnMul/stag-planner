"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { TopBar } from "@/components/TopBar";
import { EventNav } from "@/components/EventNav";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import { getEvent } from "@/lib/firestore/events";
import { EventProvider } from "./event-context";
import type { StagEvent } from "@/lib/types";

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <Inner>{children}</Inner>
    </AuthGate>
  );
}

function Inner({ children }: { children: React.ReactNode }) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [event, setEvent] = useState<StagEvent | null | undefined>(undefined);

  useEffect(() => {
    if (!params?.id) return;
    getEvent(params.id).then(setEvent);
  }, [params?.id]);

  useEffect(() => {
    if (event === null) router.replace("/events");
    else if (event && user && !event.memberIds.includes(user.uid)) router.replace("/events");
  }, [event, user, router]);

  if (event === undefined || event === null) return <FullPageSpinner />;
  if (user && !event.memberIds.includes(user.uid)) return <FullPageSpinner />;

  return (
    <EventProvider value={{ event, refresh: async () => setEvent((await getEvent(event.id)) ?? event) }}>
      <TopBar title={event.title} />
      <EventNav eventId={event.id} />
      <main className="mx-auto max-w-5xl px-4 py-6 pb-24 sm:pb-6">{children}</main>
    </EventProvider>
  );
}
