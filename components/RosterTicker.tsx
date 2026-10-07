"use client";

import type { Phase, PublicUser, Restaurant } from "@/lib/types";

type Tone = "done" | "voting" | "waiting" | "away";

const TONE_STYLES: Record<Tone, { tile: string; dot: string; text: string }> = {
  done: { tile: "border-win/30 bg-win/10", dot: "bg-win", text: "text-win" },
  voting: { tile: "border-sky/25 bg-sky/5", dot: "bg-sky", text: "text-sky/80" },
  waiting: { tile: "border-white/10 bg-white/5", dot: "bg-white/25", text: "text-white/40" },
  away: { tile: "border-white/5 bg-white/[0.03] opacity-60", dot: "bg-white/20", text: "text-white/30" },
};

// One plain-language status per person, so nobody has to guess whether
// "waiting" means undecided, not coming, or just not voted yet.
function statusFor(
  u: PublicUser,
  phase: Phase,
  hasPick: boolean
): { text: string; tone: Tone; decided: boolean } {
  if (u.notComing) return { text: "not coming", tone: "away", decided: false };
  if (phase === "submission") {
    if (hasPick) return { text: "picked", tone: "done", decided: true };
    if (u.passedSubmission) return { text: "just voting", tone: "voting", decided: true };
    return { text: "deciding", tone: "waiting", decided: false };
  }
  return u.hasVoted
    ? { text: "voted", tone: "done", decided: true }
    : { text: "yet to vote", tone: "waiting", decided: false };
}

export function RosterTicker({
  users,
  restaurants,
  phase,
  me,
}: {
  users: PublicUser[];
  restaurants: Restaurant[];
  phase: Phase;
  me: string;
}) {
  if (users.length === 0) return null;
  const hasPick = (u: PublicUser) => restaurants.some((r) => r.submittedBy === u.username);
  const active = users.filter((u) => !u.notComing);
  const notComingUsers = users.filter((u) => u.notComing);
  const decidedCount = active.filter((u) => statusFor(u, phase, hasPick(u)).decided).length;

  function renderTile(u: PublicUser) {
    const status = statusFor(u, phase, hasPick(u));
    const style = TONE_STYLES[status.tone];

    return (
      <div
        key={u.username}
        className={`flex min-w-[112px] items-center gap-2 rounded-xl border px-3 py-1.5 ${style.tile}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">
            {u.isAdmin && "👑"}
            {u.username}
            {u.username === me && <span className="ml-1 text-xs font-normal text-white/40">(you)</span>}
          </p>
          <p className={`truncate text-xs ${style.text}`}>{status.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="felt-panel rounded-2xl px-4 py-3">
      <p className="mb-2 text-xs font-semibold tracking-wide text-sky/80">
        {phase === "submission" ? "DECIDED" : "VOTED"} ({decidedCount}/{active.length})
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
