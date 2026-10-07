"use client";

import type { Phase, PublicUser, Restaurant } from "@/lib/types";
import { TONE_STYLES, type Tone } from "@/lib/statusTone";

// One plain-language status per person. Everyone is coming unless they say
// otherwise, so someone who hasn't nominated or chosen to just vote yet is
// simply "coming".
function statusFor(
  u: PublicUser,
  phase: Phase,
  hasPick: boolean
): { text: string; tone: Tone; decided: boolean } {
  if (u.notComing) return { text: "not coming", tone: "away", decided: false };
  if (phase === "submission") {
    if (hasPick) return { text: "nominated", tone: "done", decided: true };
    if (u.passedSubmission) return { text: "just voting", tone: "voting", decided: true };
    return { text: "coming", tone: "waiting", decided: false };
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

  function nameOf(u: PublicUser) {
    return (
      <>
        {u.isAdmin && "👑"}
        {u.username}
        {u.username === me && <span className="font-normal text-white/40"> (you)</span>}
      </>
    );
  }

  // No card per person: a dot, a name, and one quiet word under it for where
  // they stand.
  return (
    <div className="felt-panel rounded-2xl px-4 py-3">
      <p className="mb-2 text-xs font-semibold tracking-wide text-sky/80">
        COMING ({active.length})
      </p>
      <ul className="flex flex-wrap gap-x-6 gap-y-3">
        {active.map((u) => {
          const status = statusFor(u, phase, hasPick(u));
          const style = TONE_STYLES[status.tone];
          return (
            <li key={u.username} className="flex items-start gap-2">
              <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
              <div className="leading-tight">
                <p className="text-sm font-semibold">{nameOf(u)}</p>
                <p className={`text-xs ${style.text}`}>{status.text}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {notComingUsers.length > 0 && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <p className="mb-2 text-xs font-semibold tracking-wide text-white/30">
            NOT COMING ({notComingUsers.length})
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-1.5">
            {notComingUsers.map((u) => (
              <li key={u.username} className="flex items-center gap-2 text-sm text-white/40">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_STYLES.away.dot}`} />
                {nameOf(u)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
