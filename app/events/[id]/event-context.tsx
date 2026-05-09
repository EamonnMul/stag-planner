"use client";

import { createContext, useContext, ReactNode } from "react";
import type { StagEvent } from "@/lib/types";

interface EventCtx {
  event: StagEvent;
  isMember: boolean;
  canWrite: boolean;       // signed in AND a member
  isOrganiser: boolean;
  isPublicViewer: boolean; // viewing a public event but not a member
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
