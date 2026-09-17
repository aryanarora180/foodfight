"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGameState } from "@/lib/hooks";
import { SubmissionPhase } from "./SubmissionPhase";
import { VotingPhase } from "./VotingPhase";
import { ResultsPhase } from "./ResultsPhase";
import { AdminPanel } from "./AdminPanel";
import { RosterTicker } from "./RosterTicker";
import { VaultTab } from "./VaultTab";
import { NavShell, type NavTab } from "./NavShell";

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

type TabId = "play" | "vault" | "admin";

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
  const [activeTab, setActiveTab] = useState<TabId>("play");

  if (!state) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="font-display animate-pulse text-gold">shuffling the deck…</p>
      </div>
    );
  }

  const tabs: NavTab[] = [
    { id: "play", label: "Play", icon: "🎰" },
    { id: "vault", label: "Vault", icon: "🗄️" },
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: "👑" }] : []),
  ];
  const tab = isAdmin || activeTab !== "admin" ? activeTab : "play";

  return (
    <NavShell
      tabs={tabs}
      activeTab={tab}
      onTabChange={(id) => setActiveTab(id as TabId)}
      username={username}
      isAdmin={isAdmin}
      phaseLabel={PHASE_LABEL[state.phase]}
      votingTypeLabel={state.phase !== "submission" ? VOTING_TYPE_BADGE[state.votingType] : null}
      onLogout={onLogout}
    >
      {tab === "play" && (
        <div>
          <div className="mb-6">
            <RosterTicker
              users={state.users}
              phase={state.phase}
              isAdmin={isAdmin}
              username={username}
              onChanged={() => mutate()}
            />
          </div>

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
      )}

      {tab === "vault" && (
        <VaultTab state={state} isAdmin={isAdmin} onChanged={() => mutate()} />
      )}

      {tab === "admin" && isAdmin && <AdminPanel state={state} onChanged={() => mutate()} />}
    </NavShell>
  );
}
