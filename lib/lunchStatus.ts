import type { PublicState, Restaurant } from "./types";

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
