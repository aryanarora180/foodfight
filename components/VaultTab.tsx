"use client";

import { useState } from "react";
import type { PublicState } from "@/lib/types";
import { WinnersLog } from "./WinnersLog";
import { RestaurantVault } from "./RestaurantVault";

export function VaultTab({
  state,
  isAdmin,
  onChanged,
}: {
  state: PublicState;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<"winners" | "suggestions">("winners");

  return (
    <div>
      <h2 className="font-display mb-1 text-2xl text-gold">The Vault 🗄️</h2>
      <p className="mb-6 text-sm text-white/50">
        stats &amp; history — past winners and every restaurant anyone&apos;s ever suggested. to
        submit or reuse a pick for the current round, head to Play.
      </p>

      <div className="mb-6 inline-flex rounded-full border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setTab("winners")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            tab === "winners" ? "bg-gold/15 text-gold" : "text-white/50 hover:text-white/80"
          }`}
        >
          🏆 winners
        </button>
        <button
          type="button"
          onClick={() => setTab("suggestions")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            tab === "suggestions" ? "bg-gold/15 text-gold" : "text-white/50 hover:text-white/80"
          }`}
        >
          🍽️ suggestions
        </button>
      </div>

      {tab === "winners" ? (
        <WinnersLog winnerHistory={state.winnerHistory} isAdmin={isAdmin} onChanged={onChanged} />
      ) : state.history.length === 0 ? (
        <div className="felt-panel rounded-2xl p-8 text-center">
          <p className="mb-1 text-3xl">🍽️</p>
          <p className="text-sm text-white/50">nobody&apos;s suggested a restaurant yet.</p>
        </div>
      ) : (
        <div className="felt-panel rounded-2xl p-4">
          <RestaurantVault
            history={state.history}
            isAdmin={isAdmin}
            currentNames={new Set()}
            onPick={() => {}}
            onChanged={onChanged}
            readOnly
          />
        </div>
      )}
    </div>
  );
}
