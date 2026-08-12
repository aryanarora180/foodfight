export type Phase = "submission" | "voting" | "results";

export interface Restaurant {
  id: string;
  name: string;
  url: string;
  submittedBy: string;
  submittedAt: number;
}

export interface UserRecord {
  username: string;
  isAdmin: boolean;
  createdAt: number;
}

export interface VoteRecord {
  username: string;
  order: string[];
  votedAt: number;
}

export interface GameState {
  phase: Phase;
  restaurants: Restaurant[];
  votes: Record<string, VoteRecord>;
  users: Record<string, UserRecord>;
  passes: Record<string, boolean>;
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
  restaurants: Restaurant[];
  votes: VoteRecord[];
  scores: ScoreEntry[];
  winner: ScoreEntry | null;
  tie: boolean;
  users: PublicUser[];
  updatedAt: number;
}
