"use client";

import { useState } from "react";
import type { Phase, PublicUser } from "@/lib/types";
import { ConfirmModal } from "./ConfirmModal";

export function RosterTicker({
  users,
  phase,
  isAdmin,
  onChanged,
}: {
  users: PublicUser[];
  phase: Phase;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  if (users.length === 0) return null;
  const label = phase === "submission" ? "locked in a pick" : "voted";
  const doneCount = users.filter((u) =>
    phase === "submission" ? u.hasSubmitted : u.hasVoted
  ).length;

  async function confirmRemove() {
    const username = pendingRemove;
    setPendingRemove(null);
    if (!username) return;
    setRemoving(username);
    try {
      await fetch("/api/admin/remove-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      onChanged();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="felt-panel rounded-2xl px-4 py-3">
      <ConfirmModal
        open={pendingRemove !== null}
        title="kick them out?"
        message={`${pendingRemove} loses their seat — picks and votes go with them.`}
        confirmLabel="kick 'em"
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
      <p className="mb-2 text-xs font-semibold tracking-wide text-sky/80">
        WHO&apos;S {phase === "submission" ? "IN" : "VOTED"} ({doneCount}/{users.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {users.map((u) => {
          const done = phase === "submission" ? u.hasSubmitted : u.hasVoted;
          const passed = phase === "submission" && u.passedSubmission;
          return (
            <span
              key={u.username}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                done ? "bg-win/15 text-win" : "bg-white/5 text-white/40"
              }`}
              title={
                passed
                  ? `${u.username} — sitting this one out`
                  : done
                    ? `${u.username} ${label}`
                    : `${u.username} — waiting`
              }
            >
              {u.isAdmin && "👑"}
              {u.username}
              {passed ? " 🤷" : done ? " ✓" : " …"}
              {isAdmin && !u.isAdmin && (
                <button
                  type="button"
                  onClick={() => setPendingRemove(u.username)}
                  disabled={removing === u.username}
                  aria-label={`remove ${u.username}`}
                  className="ml-1 leading-none text-white/40 hover:text-red-300 disabled:opacity-40"
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
