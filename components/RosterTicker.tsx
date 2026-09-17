"use client";

import type { Phase, PublicUser } from "@/lib/types";

export function RosterTicker({
  users,
  phase,
}: {
  users: PublicUser[];
  phase: Phase;
}) {
  if (users.length === 0) return null;
  const label = phase === "submission" ? "locked in a pick" : "voted";
  const active = users.filter((u) => !u.notComing);
  const notComingUsers = users.filter((u) => u.notComing);
  const doneCount = active.filter((u) => (phase === "submission" ? u.hasSubmitted : u.hasVoted))
    .length;

  function renderTile(u: PublicUser) {
    const done = phase === "submission" ? u.hasSubmitted : u.hasVoted;
    const passed = phase === "submission" && u.passedSubmission;
    const statusText = u.notComing
      ? "not coming"
      : passed
        ? "sitting out"
        : done
          ? label
          : "waiting";
    const dotColor = u.notComing
      ? "bg-white/20"
      : done
        ? "bg-win"
        : passed
          ? "bg-gold"
          : "bg-white/25";

    return (
      <div
        key={u.username}
        className={`flex min-w-[112px] items-center gap-2 rounded-xl border px-3 py-1.5 ${
          u.notComing
            ? "border-white/5 bg-white/[0.03] opacity-60"
            : done
              ? "border-win/30 bg-win/10"
              : passed
                ? "border-gold/25 bg-gold/5"
                : "border-white/10 bg-white/5"
        }`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">
            {u.isAdmin && "👑"}
            {u.username}
          </p>
          <p
            className={`truncate text-xs ${
              u.notComing
                ? "text-white/30"
                : done
                  ? "text-win"
                  : passed
                    ? "text-gold/80"
                    : "text-white/40"
            }`}
          >
            {statusText}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="felt-panel rounded-2xl px-4 py-3">
      <p className="mb-2 text-xs font-semibold tracking-wide text-sky/80">
        WHO&apos;S {phase === "submission" ? "IN" : "VOTED"} ({doneCount}/{active.length})
      </p>
      <div className="flex flex-wrap gap-2">{active.map(renderTile)}</div>

      {notComingUsers.length > 0 && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <p className="mb-2 text-xs font-semibold tracking-wide text-white/30">
            NOT COMING ({notComingUsers.length})
          </p>
          <div className="flex flex-wrap gap-2">{notComingUsers.map(renderTile)}</div>
        </div>
      )}
    </div>
  );
}
