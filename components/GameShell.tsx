"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGameState } from "@/lib/hooks";
import { SubmissionPhase } from "./SubmissionPhase";
import { VotingPhase } from "./VotingPhase";
import { ResultsPhase } from "./ResultsPhase";
import { AdminPanel } from "./AdminPanel";
import { RosterTicker } from "./RosterTicker";

const PHASE_LABEL: Record<string, string> = {
  submission: "📝 submissions open",
  voting: "🗳️ voting live",
  results: "🏆 results are set",
};

const VOTING_TYPE_BADGE: Record<string, string> = {
  simple: "🗳️ simple",
  points: "📊 points",
  ranked: "🏆 ranked choice",
};

export function GameShell({
  username,
  isAdmin,
  onLogout,
}: {
  username: string;
  isAdmin: boolean;
  onLogout: () => void;
}) {
  const { state, mutate } = useGameState(true);

  if (!state) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="font-display animate-pulse text-gold">shuffling the deck…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <header className="bulb-border felt-panel neon-border mb-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎰</span>
          <h1 className="font-display neon-text text-2xl sm:text-3xl">FOOD FIGHT</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-sky/90">
            {PHASE_LABEL[state.phase]}
          </span>
          {state.phase !== "submission" && (
            <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/50">
              {VOTING_TYPE_BADGE[state.votingType]}
            </span>
          )}
          <span className="rounded-full bg-white/5 px-3 py-1.5 text-sm">
            {isAdmin && "👑 "}
            {username}
          </span>
          <button onClick={onLogout} className="chip-btn-ghost rounded-full px-4 py-1.5 text-sm">
            Log out
          </button>
        </div>
      </header>

      <div className="mb-6">
        <RosterTicker
          users={state.users}
          phase={state.phase}
          isAdmin={isAdmin}
          username={username}
          onChanged={() => mutate()}
        />
      </div>

      {isAdmin && (
        <div className="mb-8">
          <AdminPanel state={state} onChanged={() => mutate()} />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={state.phase}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
        >
          {state.phase === "submission" && (
            <SubmissionPhase
              state={state}
              username={username}
              isAdmin={isAdmin}
              onChanged={() => mutate()}
            />
          )}
          {state.phase === "voting" && (
            <VotingPhase state={state} username={username} onChanged={() => mutate()} />
          )}
          {state.phase === "results" && <ResultsPhase state={state} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
