"use client";

import type { Phase, PublicUser } from "@/lib/types";

export function RosterTicker({ users, phase }: { users: PublicUser[]; phase: Phase }) {
  if (users.length === 0) return null;
  const label = phase === "submission" ? "locked in a pick" : "voted";
  const doneCount = users.filter((u) =>
    phase === "submission" ? u.hasSubmitted : u.hasVoted
  ).length;

  return (
    <div className="felt-panel rounded-2xl px-4 py-3">
      <p className="mb-2 text-xs font-semibold tracking-wide text-cyan/80">
        WHO&apos;S {phase === "submission" ? "IN" : "VOTED"} ({doneCount}/{users.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {users.map((u) => {
          const done = phase === "submission" ? u.hasSubmitted : u.hasVoted;
          return (
            <span
              key={u.username}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                done
                  ? "bg-win/15 text-win"
                  : "bg-white/5 text-white/40"
              }`}
              title={done ? `${u.username} ${label}` : `${u.username} — waiting`}
            >
              {u.isAdmin && "👑"}
              {u.username}
              {done ? " ✓" : " …"}
            </span>
          );
        })}
      </div>
    </div>
  );
}
