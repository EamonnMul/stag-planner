"use client";

import { createContext, useContext, ReactNode } from "react";
import type { StagEvent } from "@/lib/types";
import { useAuth } from "@/lib/auth";

interface EventCtx {
  event: StagEvent;
  refresh: () => Promise<void>;
}

const Ctx = createContext<EventCtx | undefined>(undefined);

export function EventProvider({ value, children }: { value: EventCtx; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEvent() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEvent must be used inside EventProvider");
  return ctx;
}

export function useIsOrganiser() {
  const { event } = useEvent();
  const { user } = useAuth();
  return user?.uid === event.organiserId;
}
