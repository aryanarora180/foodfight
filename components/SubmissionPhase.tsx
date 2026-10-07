"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { REACTION_EMOJI, type PublicState as State, type Restaurant } from "@/lib/types";
import { EditRestaurantModal } from "./EditRestaurantModal";
import { ConfirmModal } from "./ConfirmModal";
import { lunchStatus } from "@/lib/lunchStatus";

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
  const [pendingReactions, setPendingReactions] = useState<Record<string, number>>({});

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

  async function react(restaurantId: string, emoji: string) {
    const key = `${restaurantId}:${emoji}`;
    setPendingReactions((p) => ({ ...p, [key]: (p[key] ?? 0) + 1 }));
    try {
      await fetch("/api/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, emoji }),
      });
      onChanged();
    } finally {
      setPendingReactions((p) => ({ ...p, [key]: Math.max(0, (p[key] ?? 0) - 1) }));
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
                  <p className="mt-1 text-xs text-white/40">nominated by {r.submittedBy}</p>
                  <p className="mt-2 text-xs text-sky/70 underline">view menu →</p>
                </a>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {REACTION_EMOJI.map((emoji) => {
                    const key = `${r.id}:${emoji}`;
                    const total = (r.reactions?.[emoji] ?? 0) + (pendingReactions[key] ?? 0);
                    return (
                      <motion.button
                        key={emoji}
                        type="button"
                        onClick={() => react(r.id, emoji)}
                        disabled={readOnly}
                        whileTap={readOnly ? undefined : { scale: 0.8 }}
                        className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs transition enabled:hover:border-gold/40 enabled:hover:bg-gold/10 enabled:active:border-gold/60 disabled:cursor-default disabled:opacity-60"
                      >
                        <span>{emoji}</span>
                        {total > 0 && (
                          <AnimatePresence mode="popLayout" initial={false}>
                            <motion.span
                              key={total}
                              initial={{ y: -6, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: 6, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="text-white/50"
                            >
                              {total}
                            </motion.span>
                          </AnimatePresence>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
