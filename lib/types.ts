export type Phase = "submission" | "voting" | "results";
export type VotingType = "simple" | "points" | "ranked";

export interface Restaurant {
  id: string;
  name: string;
  url: string;
  submittedBy: string;
  submittedAt: number;
  reactions?: Record<string, number>;
}

export const REACTION_EMOJI = ["🔥", "😍", "🤢", "👀"] as const;

export interface RankedRound {
  counts: { restaurantId: string; votes: number }[];
  eliminated: string[];
}

export interface UserRecord {
  username: string;
  isAdmin: boolean;
  createdAt: number;
  passwordHash?: string;
  mustChangePassword?: boolean;
}

export interface HistoryEntry {
  username: string;
  name: string;
  url: string;
  updatedAt: number;
}

export interface VoteRecord {
  username: string;
  order: string[];
  votedAt: number;
}

export interface GameState {
  phase: Phase;
  votingType: VotingType;
  restaurants: Restaurant[];
  votes: Record<string, VoteRecord>;
  users: Record<string, UserRecord>;
  passes: Record<string, boolean>;
  restaurantHistory: Record<string, HistoryEntry>;
  updatedAt: number;
}

export interface PublicUser {
  username: string;
  isAdmin: boolean;
  hasSubmitted: boolean;
  passedSubmission: boolean;
  hasVoted: boolean;
}

export interface ScoreEntry {
  restaurant: Restaurant;
  points: number;
  firstPlaceVotes: number;
}

export interface PublicState {
  phase: Phase;
  votingType: VotingType;
  restaurants: Restaurant[];
  votes: VoteRecord[];
  scores: ScoreEntry[];
  winner: ScoreEntry | null;
  tie: boolean;
  rankedRounds: RankedRound[] | null;
  users: PublicUser[];
  history: HistoryEntry[];
  updatedAt: number;
}
