import type { GameState, PublicState, PublicUser, RankedRound, ScoreEntry, VotingType } from "./types";

export const MIN_RESTAURANTS_TO_VOTE = 2;

export const VOTING_TYPE_LABEL: Record<VotingType, string> = {
  simple: "simple vote — one pick each, most votes wins",
  points: "points-based ranking",
  ranked: "ranked choice (instant runoff)",
};

interface ResultsComputation {
  scores: ScoreEntry[];
  winnerId: string | null;
  tie: boolean;
  rounds?: RankedRound[];
}

function computePointsResults(state: GameState): ResultsComputation {
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

  const scores = state.restaurants
    .map((restaurant) => ({
      restaurant,
      points: points.get(restaurant.id) ?? 0,
      firstPlaceVotes: firstPlace.get(restaurant.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points || b.firstPlaceVotes - a.firstPlaceVotes);

  const topScore = scores[0]?.points ?? 0;
  const winners = scores.filter((s) => s.points === topScore && topScore > 0);
  const tie = winners.length > 1;
  return { scores, winnerId: !tie ? scores[0]?.restaurant.id ?? null : null, tie };
}

function computeSimpleResults(state: GameState): ResultsComputation {
  const counts = new Map<string, number>();
  for (const r of state.restaurants) counts.set(r.id, 0);
  for (const vote of Object.values(state.votes)) {
    const pick = vote.order[0];
    if (pick && counts.has(pick)) counts.set(pick, (counts.get(pick) ?? 0) + 1);
  }

  const scores = state.restaurants
    .map((restaurant) => ({
      restaurant,
      points: counts.get(restaurant.id) ?? 0,
      firstPlaceVotes: counts.get(restaurant.id) ?? 0,
    }))
    .sort((a, b) => b.points - a.points);

  const topScore = scores[0]?.points ?? 0;
  const winners = scores.filter((s) => s.points === topScore && topScore > 0);
  const tie = winners.length > 1;
  return { scores, winnerId: !tie ? scores[0]?.restaurant.id ?? null : null, tie };
}

// instant-runoff: repeatedly drop the lowest vote-getter and redistribute
// until someone clears a majority of remaining ballots, or a full tie
// among everyone left makes the round unresolvable.
function computeRankedResults(state: GameState): ResultsComputation {
  const restaurants = state.restaurants;
  const ballots = Object.values(state.votes);

  const initialFirstPlace = new Map<string, number>();
  for (const r of restaurants) initialFirstPlace.set(r.id, 0);
  for (const vote of ballots) {
    const top = vote.order[0];
    if (top && initialFirstPlace.has(top)) {
      initialFirstPlace.set(top, (initialFirstPlace.get(top) ?? 0) + 1);
    }
  }

  const active = new Set(restaurants.map((r) => r.id));
  const finalCount = new Map<string, number>();
  const rounds: RankedRound[] = [];
  let winnerId: string | null = null;
  let tie = false;

  while (active.size > 0) {
    const counts = new Map<string, number>();
    for (const id of active) counts.set(id, 0);
    let validBallots = 0;
    for (const vote of ballots) {
      const choice = vote.order.find((id) => active.has(id));
      if (choice) {
        counts.set(choice, (counts.get(choice) ?? 0) + 1);
        validBallots++;
      }
    }
    for (const [id, c] of counts) finalCount.set(id, c);

    const roundCounts = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([restaurantId, votes]) => ({ restaurantId, votes }));

    if (active.size === 1) {
      winnerId = [...active][0];
      rounds.push({ counts: roundCounts, eliminated: [] });
      break;
    }

    const majority = validBallots / 2;
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    if (validBallots > 0 && sorted[0][1] > majority) {
      winnerId = sorted[0][0];
      rounds.push({ counts: roundCounts, eliminated: [] });
      break;
    }

    const minVotes = Math.min(...counts.values());
    const lowest = [...counts.entries()].filter(([, v]) => v === minVotes).map(([id]) => id);
    if (lowest.length === active.size) {
      tie = true;
      rounds.push({ counts: roundCounts, eliminated: [] });
      break;
    }
    for (const id of lowest) active.delete(id);
    rounds.push({ counts: roundCounts, eliminated: lowest });
  }

  const scores = restaurants
    .map((restaurant) => ({
      restaurant,
      points: finalCount.get(restaurant.id) ?? 0,
      firstPlaceVotes: initialFirstPlace.get(restaurant.id) ?? 0,
    }))
    .sort((a, b) => {
      if (a.restaurant.id === winnerId) return -1;
      if (b.restaurant.id === winnerId) return 1;
      return b.points - a.points || b.firstPlaceVotes - a.firstPlaceVotes;
    });

  return { scores, winnerId, tie, rounds };
}

export function computeResults(state: GameState): ResultsComputation {
  if (state.votingType === "simple") return computeSimpleResults(state);
  if (state.votingType === "ranked") return computeRankedResults(state);
  return computePointsResults(state);
}

export function toPublicState(state: GameState): PublicState {
  const { scores, winnerId, tie, rounds } = computeResults(state);
  const winner = scores.find((s) => s.restaurant.id === winnerId) ?? null;

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

  const history = Object.values(state.restaurantHistory).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return {
    phase: state.phase,
    votingType: state.votingType,
    restaurants: state.restaurants,
    votes: state.phase === "submission" ? [] : Object.values(state.votes),
    scores,
    winner: state.phase === "results" && !tie ? winner : null,
    tie: state.phase === "results" && tie,
    rankedRounds:
      state.phase === "results" && state.votingType === "ranked" ? (rounds ?? []) : null,
    users,
    history,
    updatedAt: state.updatedAt,
  };
}
