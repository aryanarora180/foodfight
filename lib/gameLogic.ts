import type { GameState, PublicState, PublicUser, ScoreEntry } from "./types";

export const MIN_RESTAURANTS_TO_VOTE = 2;

export function computeScores(state: GameState): ScoreEntry[] {
  const n = state.restaurants.length;
  const points = new Map<string, number>();
  const firstPlace = new Map<string, number>();
  for (const r of state.restaurants) {
    points.set(r.id, 0);
    firstPlace.set(r.id, 0);
  }

  for (const vote of Object.values(state.votes)) {
    vote.order.forEach((restaurantId, idx) => {
      if (!points.has(restaurantId)) return;
      points.set(restaurantId, (points.get(restaurantId) ?? 0) + (n - idx));
      if (idx === 0) firstPlace.set(restaurantId, (firstPlace.get(restaurantId) ?? 0) + 1);
    });
  }

  return state.restaurants
    .map((restaurant) => ({
      restaurant,
      points: points.get(restaurant.id) ?? 0,
      firstPlaceVotes: firstPlace.get(restaurant.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points || b.firstPlaceVotes - a.firstPlaceVotes);
}

export function toPublicState(state: GameState): PublicState {
  const scores = computeScores(state);
  const topScore = scores[0]?.points ?? 0;
  const winners = scores.filter((s) => s.points === topScore && topScore > 0);
  const tie = winners.length > 1;

  const users: PublicUser[] = Object.values(state.users)
    .map((u) => {
      const passedSubmission = Boolean(state.passes[u.username]);
      return {
        username: u.username,
        isAdmin: u.isAdmin,
        hasSubmitted:
          state.restaurants.some((r) => r.submittedBy === u.username) || passedSubmission,
        passedSubmission,
        hasVoted: Boolean(state.votes[u.username]),
      };
    })
    .sort((a, b) => a.username.localeCompare(b.username));

  return {
    phase: state.phase,
    restaurants: state.restaurants,
    votes: state.phase === "submission" ? [] : Object.values(state.votes),
    scores,
    winner: state.phase === "results" && !tie ? scores[0] ?? null : null,
    tie: state.phase === "results" && tie,
    users,
    updatedAt: state.updatedAt,
  };
}
