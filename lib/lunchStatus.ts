import type { PublicState, Restaurant } from "./types";
import type { Tone } from "./statusTone";

// Where one person stands for the round, in the terms the UI talks about:
//  undecided   in, but hasn't picked a place or chosen to just vote
//  picked      in, and submitted a restaurant
//  just-voting in, no restaurant from them, still votes
//  not-coming  out for this round, no pick or vote needed
export type LunchStatus = "undecided" | "picked" | "just-voting" | "not-coming";

export function lunchStatus(
  state: Pick<PublicState, "users" | "restaurants">,
  username: string
): { status: LunchStatus; pick: Restaurant | null } {
  const me = state.users.find((u) => u.username === username);
  const pick = state.restaurants.find((r) => r.submittedBy === username) ?? null;
  if (me?.notComing) return { status: "not-coming", pick };
  if (pick) return { status: "picked", pick };
  if (me?.passedSubmission) return { status: "just-voting", pick: null };
  return { status: "undecided", pick: null };
}

// One word for how a person stands right now, with a tone for colouring it.
// Everyone is coming unless they say otherwise, so someone who hasn't
// nominated or chosen to just vote yet is simply "coming".
export function statusWord(
  state: Pick<PublicState, "phase" | "users" | "restaurants">,
  username: string
): { text: string; tone: Tone } {
  const me = state.users.find((u) => u.username === username);
  const { status } = lunchStatus(state, username);
  if (status === "not-coming") return { text: "not coming", tone: "away" };
  if (state.phase === "voting") {
    return me?.hasVoted
      ? { text: "voted", tone: "done" }
      : { text: "yet to vote", tone: "waiting" };
  }
  if (state.phase === "results") return { text: "coming", tone: "waiting" };
  if (status === "picked") return { text: "nominated", tone: "done" };
  if (status === "just-voting") return { text: "just voting", tone: "voting" };
  return { text: "coming", tone: "waiting" };
}
