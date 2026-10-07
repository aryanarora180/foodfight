"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PublicState } from "@/lib/types";
import { isDodgy } from "@/lib/rodeoGoat";
import { AddRestaurantModal } from "./AddRestaurantModal";
import { lastWonByName, wonText } from "@/lib/recentWins";
import { DodgyGoatChip } from "./DodgyGoatChip";
import { RodeoGoatModal } from "./RodeoGoatModal";

// The restaurant picker, as a sheet you open on demand instead of a second
// list sitting on the page. Tapping a place nominates it; places someone has
// already nominated this round are marked and can't be taken twice.
export function NominateSheet({
  open,
  onClose,
  state,
  username,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  state: PublicState;
  username: string;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showGoat, setShowGoat] = useState(false);

  const mine = state.restaurants.find((r) => r.submittedBy === username);
  const takenBy = new Map(
    state.restaurants.map((r) => [r.name.trim().toLowerCase(), r.submittedBy])
  );
  const lastWon = lastWonByName(state.winnerHistory);
  const query = filter.trim().toLowerCase();
  const entries = state.history.filter((h) => !query || h.name.toLowerCase().includes(query));

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function pick(historyId: string) {
    setError(null);
    setPicking(historyId);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "something went wrong");
        return;
      }
      const entry = state.history.find((h) => h.id === historyId);
      if (entry && isDodgy(entry)) setShowGoat(true);
      setFilter("");
      onClose();
      onChanged();
    } catch {
      setError("network error. try again.");
    } finally {
      setPicking(null);
    }
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:px-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ y: 48, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 48, opacity: 0 }}
              transition={{ type: "tween", duration: 0.22 }}
              role="dialog"
              aria-label="nominate a restaurant"
              onClick={(e) => e.stopPropagation()}
              className="felt-panel neon-border flex max-h-[85dvh] w-full max-w-md flex-col rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-3xl"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-display text-xl text-gold">Nominate a restaurant</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAdd(true)}
                    aria-label="add a restaurant to the list"
                    title="add a restaurant to the list"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-lg font-semibold text-gold transition hover:bg-gold/25"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="close"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {state.history.length > 6 && (
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="search"
                  className="mb-3 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm outline-none focus:border-gold/60"
                />
              )}

              {error && (
                <p className="mb-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}

              {state.history.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-black/20 px-4 py-6 text-center text-sm text-white/40">
                  no restaurants yet. tap + to add one.
                </p>
              ) : entries.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-white/40">nothing matches.</p>
              ) : (
                <ul className="-mx-1 flex-1 overflow-y-auto px-1">
                  {entries.map((entry) => {
                    const owner = takenBy.get(entry.name.trim().toLowerCase());
                    const isMine = owner === username;
                    const taken = Boolean(owner) && !isMine;
                    return (
                      <li
                        key={entry.id}
                        className={`flex items-center justify-between gap-3 border-b border-white/5 py-1 text-sm last:border-b-0 ${
                          isMine ? "text-gold" : taken ? "text-white/30" : ""
                        }`}
                      >
                        <div className="flex min-w-0 flex-1 items-center">
                          {isDodgy(entry) && !taken && !isMine ? (
                            <DodgyGoatChip
                              entry={entry}
                              onPick={() => pick(entry.id)}
                              disabled={picking !== null}
                              busy={picking === entry.id}
                              rowStyle
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => pick(entry.id)}
                              disabled={taken || isMine || picking !== null}
                              className="min-w-0 flex-1 truncate py-2.5 text-left font-medium enabled:hover:text-gold disabled:cursor-default"
                            >
                              {picking === entry.id ? "…" : entry.name}
                            </button>
                          )}
                        </div>
                        <span className="shrink-0 text-xs">
                          {isMine ? (
                            "✓ yours"
                          ) : taken ? (
                            "on the ballot"
                          ) : (
                            <>
                              {wonText(lastWon, entry.name) && (
                                <span className="mr-3 text-gold/60">{wonText(lastWon, entry.name)}</span>
                              )}
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`view ${entry.name} menu`}
                              className="text-sky/70 underline hover:text-sky"
                            >
                              menu
                            </a>
                            </>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {mine && (
                <p className="mt-3 text-center text-xs text-white/40">
                  picking a new place replaces {mine.name}.
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* after the sheet in the DOM so they stack above it */}
      <RodeoGoatModal open={showGoat} onClose={() => setShowGoat(false)} />
      <AddRestaurantModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={() => {
          setShowAdd(false);
          onChanged();
        }}
      />
    </>
  );
}
