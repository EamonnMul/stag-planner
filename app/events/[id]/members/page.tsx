"use client";

import { FormEvent, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Empty } from "@/components/ui/Empty";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth";
import {
  inviteMemberByEmail,
  listMembers,
  removeMember,
} from "@/lib/firestore/events";
import { formatRelative } from "@/lib/format";
import type { Member } from "@/lib/types";
import { useEvent, useIsOrganiser } from "../event-context";

export default function MembersPage() {
  const { event, refresh: refreshEvent } = useEvent();
  const { user, profile } = useAuth();
  const isOrganiser = useIsOrganiser();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const refresh = async () => setMembers(await listMembers(event.id));
  useEffect(() => { refresh(); }, [event.id]);

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await inviteMemberByEmail(event.id, email, { id: user.uid, name: profile.name });
      if (res.added) {
        setMessage({ kind: "ok", text: `Added ${email}.` });
        setEmail("");
        await Promise.all([refresh(), refreshEvent()]);
      } else {
        setMessage({ kind: "err", text: res.reason ?? "Could not add member." });
      }
    } catch (err) {
      setMessage({ kind: "err", text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Members</h1>

      {isOrganiser && (
        <form onSubmit={onInvite} className="card">
          <label className="label">Add a member by email</label>
          <p className="text-xs text-gray-500 mb-2">They need to have an account already.</p>
          <div className="flex gap-2">
            <input
              type="email"
              className="input"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
            />
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Adding…" : "Add"}
            </button>
          </div>
          {message && (
            <p className={`mt-2 text-sm ${message.kind === "ok" ? "text-green-700" : "text-red-600"}`}>
              {message.text}
            </p>
          )}
        </form>
      )}

      {members === null ? (
        <Spinner />
      ) : members.length === 0 ? (
        <Empty title="No members" />
      ) : (
        <ul className="space-y-2">
          {members
            .slice()
            .sort((a, b) => (a.role === "organiser" ? -1 : b.role === "organiser" ? 1 : 0))
            .map((m) => (
              <li key={m.id} className="card flex items-center gap-3">
                <Avatar name={m.name} url={m.avatarUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">
                    {m.name} {m.userId === user?.uid && <span className="text-xs text-gray-400">(you)</span>}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{m.email}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Joined {formatRelative(m.joinedAt)}</div>
                </div>
                {m.role === "organiser" ? (
                  <span className="pill bg-brand-50 text-brand-700">Organiser</span>
                ) : (
                  <span className="pill">Member</span>
                )}
                {isOrganiser && m.role !== "organiser" && (
                  <button
                    onClick={async () => {
                      if (confirm(`Remove ${m.name} from the stag?`)) {
                        await removeMember(event.id, m.id, m.userId);
                        await Promise.all([refresh(), refreshEvent()]);
                      }
                    }}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
