"use client";

import { useState } from "react";
import type { PublicState } from "@/lib/types";
import { RestaurantVault } from "./RestaurantVault";
import { AddRestaurantModal } from "./AddRestaurantModal";

export function VaultTab({
  state,
  isAdmin,
  onChanged,
}: {
  state: PublicState;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <h2 className="font-display mb-1 text-2xl text-gold">Restaurants</h2>
      <p className="mb-6 text-sm text-white/50">
        the shared list everyone picks from. add one any time.
      </p>

      <AddRestaurantModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={() => {
          setShowAdd(false);
          onChanged();
        }}
      />

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-sky/80">
          THE LIST ({state.history.length})
        </p>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          aria-label="add a restaurant"
          title="add a restaurant"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-lg font-semibold text-gold transition hover:bg-gold/25"
        >
          +
        </button>
      </div>
      {state.history.length === 0 ? (
        <div className="felt-panel rounded-2xl p-8 text-center">
          <p className="text-sm text-white/50">no restaurants added yet.</p>
        </div>
      ) : (
        <div className="felt-panel rounded-2xl p-4">
          <RestaurantVault history={state.history} isAdmin={isAdmin} onChanged={onChanged} />
        </div>
      )}
    </div>
  );
}
