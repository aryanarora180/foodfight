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
  notComing?: boolean;
}

export interface HistoryEntry {
  id: string;
  username: string;
  name: string;
  url: string;
  updatedAt: number;
  // Admin-controlled: this place runs from the cursor and nags voters.
  // Unset means the default (on for Rodeo Goat, off for everything else).
  dodgy?: boolean;
  // How many times a dodgy place runs before it lets itself be picked.
  // Unset means DEFAULT_DODGE_TRIES.
  dodgeTries?: number;
}

// A frozen copy of how a round played out, kept with its winner so History
// can replay it later. Never sent with the polled state (see PublicWinner).
export interface ArchivedRound {
  restaurants: Restaurant[];
  votes: VoteRecord[];
  scores: { restaurantId: string; points: number; firstPlaceVotes: number }[];
  rankedRounds: RankedRound[] | null;
}

export interface WinnerRecord {
  id: string;
  restaurantId: string;
  name: string;
  url: string;
  submittedBy: string;
  votingType: VotingType;
  points: number;
  firstPlaceVotes: number;
  participantCount: number;
  decidedAt: number;
  // Missing on wins logged before replays existed.
  round?: ArchivedRound;
}

export type PublicWinner = Omit<WinnerRecord, "round"> & { hasReplay: boolean };

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
  winnerHistory: WinnerRecord[];
  updatedAt: number;
}

export interface PublicUser {
  username: string;
  isAdmin: boolean;
  hasSubmitted: boolean;
  passedSubmission: boolean;
  hasVoted: boolean;
  notComing: boolean;
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
  winnerHistory: PublicWinner[];
  updatedAt: number;
}
