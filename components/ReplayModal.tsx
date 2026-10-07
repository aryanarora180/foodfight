"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ArchivedRound, PublicWinner } from "@/lib/types";
import { RankedChoiceFlowChart } from "./RankedChoiceFlowChart";

// How a past round played out, loaded on demand so the polled state stays
// small. Mirrors the results screen: runoff diagram, final tally, ballots.
export function ReplayModal({
  win,
  onClose,
}: {
  win: PublicWinner | null;
  onClose: () => void;
}) {
  const [loaded, setLoaded] = useState<{ id: string; round: ArchivedRound | null } | null>(null);
  const id = win?.id;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/replay?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setLoaded({ id, round: data?.round ?? null });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ id, round: null });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!win) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [win, onClose]);

  const round = loaded && loaded.id === id ? loaded.round : null;
  const ready = loaded !== null && loaded.id === id;
  const byId = new Map(round?.restaurants.map((r) => [r.id, r]));
  const unit = win?.votingType === "points" ? "pts" : "votes";
  const maxPoints = Math.max(1, ...(round?.scores.map((s) => s.points) ?? []));

  return (
    <AnimatePresence>
      {win && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25 }}
            onClick={(e) => e.stopPropagation()}
            className="felt-panel neon-border flex max-h-[88dvh] w-full max-w-xl flex-col rounded-t-3xl p-6 sm:rounded-3xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display truncate text-xl text-gold">👑 {win.name}</p>
                <p className="text-xs text-white/40">
                  {new Date(win.decidedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {!ready ? (
                <p className="animate-pulse py-8 text-center text-sm text-white/40">loading…</p>
              ) : !round ? (
                <p className="py-8 text-center text-sm text-white/40">can&apos;t load this one.</p>
              ) : (
                <div className="flex flex-col gap-6">
                  {round.rankedRounds && round.rankedRounds.length > 1 && (
                    <RankedChoiceFlowChart rounds={round.rankedRounds} restaurantById={byId} />
                  )}

                  <div>
                    <p className="mb-3 text-xs font-semibold tracking-wide text-sky/80">
                      FINAL TALLY
                    </p>
                    <div className="flex flex-col gap-3">
                      {round.scores.map((s, idx) => (
                        <div key={s.restaurantId}>
                          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                            <span className="truncate font-semibold">
                              {idx === 0 ? "👑 " : `#${idx + 1} `}
                              {byId.get(s.restaurantId)?.name ?? "?"}
                            </span>
                            <span className="shrink-0 text-gold">
                              {s.points} {unit}
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-black/40">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-royal via-indigo to-sky"
                              style={{ width: `${(s.points / maxPoints) * 100}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-white/40">
                            picked by {byId.get(s.restaurantId)?.submittedBy ?? "?"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-semibold tracking-wide text-sky/80">
                      BALLOTS ({round.votes.length})
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {round.votes.map((v) => (
                        <div key={v.username} className="rounded-2xl bg-white/5 p-3">
                          <p className="mb-1.5 text-sm font-semibold text-gold/90">{v.username}</p>
                          <ol className="space-y-0.5 text-sm text-white/60">
                            {v.order.map((rid, idx) => (
                              <li key={rid}>
                                {["🥇", "🥈", "🥉"][idx] ?? `#${idx + 1}`} {byId.get(rid)?.name}
                              </li>
                            ))}
                          </ol>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
