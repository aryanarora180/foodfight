"use client";

import type { PublicState } from "@/lib/types";
import { WinnersLog } from "./WinnersLog";

export function HistoryTab({
  state,
  isAdmin,
  onChanged,
}: {
  state: PublicState;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  return (
    <div>
      <h2 className="font-display mb-1 text-2xl text-gold">History</h2>
      <p className="mb-6 text-sm text-white/50">
        the hall of fame. top restaurants, top pickers, and every past winner.
      </p>
      <WinnersLog winnerHistory={state.winnerHistory} isAdmin={isAdmin} onChanged={onChanged} />
    </div>
  );
}
