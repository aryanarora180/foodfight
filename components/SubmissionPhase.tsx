"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PublicState as State, Restaurant } from "@/lib/types";
import { EditRestaurantModal } from "./EditRestaurantModal";
import { ConfirmModal } from "./ConfirmModal";
import { lunchStatus } from "@/lib/lunchStatus";
import { lastWonByName, wonText } from "@/lib/recentWins";
import { ReactionBar, useReactions } from "./ReactionBar";

// The ballot: everything nominated so far, as cards. Nominating itself
// happens from the status card at the top of the tab (it opens a sheet), so
// this is the only restaurant list on the page.
export function SubmissionPhase({
  state,
  username,
  isAdmin,
  onChanged,
}: {
  state: State;
  username: string;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<Restaurant | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Restaurant | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { pending: pendingReactions, react } = useReactions(onChanged);
  const lastWon = lastWonByName(state.winnerHistory);

  // Not coming means read-only: you can look, but not edit or react.
  const readOnly = lunchStatus(state, username).status === "not-coming";

  async function confirmDeleteRestaurant() {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    setDeleting(target.id);
    try {
      await fetch("/api/admin/delete-restaurant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id }),
      });
      onChanged();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <EditRestaurantModal
        restaurant={editing}
        selfService={editing?.submittedBy === username}
        onSaved={() => {
          setEditing(null);
          onChanged();
        }}
        onCancel={() => setEditing(null)}
      />
      <ConfirmModal
        open={pendingDelete !== null}
        title="remove this pick?"
        message={`${pendingDelete?.name} comes off the table. ${pendingDelete?.submittedBy} can pick again.`}
        confirmLabel="remove it"
        onConfirm={confirmDeleteRestaurant}
        onCancel={() => setPendingDelete(null)}
      />

      <h3 className="font-display mb-3 text-lg text-sky">
        On the ballot ({state.restaurants.length})
      </h3>
      {state.restaurants.length === 0 ? (
        <div className="felt-panel rounded-2xl p-8 text-center">
          <p className="text-sm text-white/50">nobody&apos;s nominated a restaurant yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {state.restaurants.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, rotateY: -90 }}
                animate={{ opacity: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4 }}
                className="felt-panel card-hover relative block rounded-2xl p-4 transition hover:border-gold/50"
              >
                {(isAdmin || (r.submittedBy === username && !readOnly)) && (
                  <span className="absolute right-3 top-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      aria-label={`edit ${r.name}`}
                      className="text-white/40 hover:text-gold"
                    >
                      ✎
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setPendingDelete(r)}
                        disabled={deleting === r.id}
                        aria-label={`remove ${r.name}`}
                        className="text-white/40 hover:text-red-300 disabled:opacity-40"
                      >
                        🗑
                      </button>
                    )}
                  </span>
                )}
                <a href={r.url} target="_blank" rel="noreferrer" className="block">
                  <p className="mb-1 text-2xl">🍽️</p>
                  <p className="pr-10 font-semibold">{r.name}</p>
                  <p className="mt-1 text-xs text-white/40">
                    nominated by {r.submittedBy}
                    {wonText(lastWon, r.name) && (
                      <span className="text-gold/70"> · {wonText(lastWon, r.name)}</span>
                    )}
                  </p>
                  <p className="mt-2 text-xs text-sky/70 underline">view menu →</p>
                </a>
                <ReactionBar
                  restaurant={r}
                  pending={pendingReactions}
                  readOnly={readOnly}
                  onReact={react}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
