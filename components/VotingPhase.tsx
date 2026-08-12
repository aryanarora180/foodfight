"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { PublicState } from "@/lib/types";
import { RankingEditor } from "./RankingEditor";

export function VotingPhase({
  state,
  username,
  onChanged,
}: {
  state: PublicState;
  username: string;
  onChanged: () => void;
}) {
  const myVote = state.votes.find((v) => v.username === username);
  const [editing, setEditing] = useState(!myVote);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const restaurantById = new Map(state.restaurants.map((r) => [r.id, r]));
  const maxPoints = Math.max(1, ...state.scores.map((s) => s.points));

  async function submitVote(order: string[]) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "something went wrong");
        return;
      }
      setEditing(false);
      onChanged();
    } catch {
      setError("network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div className="felt-panel neon-border rounded-3xl p-6">
        <h2 className="font-display mb-1 text-xl text-gold">Shore up your rankings</h2>
        <p className="mb-5 text-sm text-white/50">
          drag to reorder — top is your favorite. 1st = {state.restaurants.length} pts, down to 1.
        </p>

        {error && (
          <p className="mb-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        {editing ? (
          <RankingEditor
            restaurants={state.restaurants}
            initialOrder={myVote?.order ?? state.restaurants.map((r) => r.id)}
            onSubmit={submitVote}
            submitting={submitting}
          />
        ) : (
          <div>
            <div className="flex flex-col gap-2">
              {myVote?.order.map((id, idx) => {
                const r = restaurantById.get(id);
                if (!r) return null;
                return (
                  <div
                    key={id}
                    className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2"
                  >
                    <span className="text-lg">{["🥇", "🥈", "🥉"][idx] ?? `#${idx + 1}`}</span>
                    <span className="flex-1 truncate">{r.name}</span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="chip-btn-ghost mt-4 w-full rounded-full py-2.5 text-sm"
            >
              re-level my vote ✏️
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h3 className="font-display mb-3 text-lg text-sky">Live odds 📊</h3>
          <div className="flex flex-col gap-3">
            {state.scores.map((s) => (
              <div key={s.restaurant.id} className="felt-panel rounded-2xl p-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-semibold">{s.restaurant.name}</span>
                  <span className="font-display text-gold">{s.points} pts</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-black/40">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-royal via-indigo to-sky"
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.points / maxPoints) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-display mb-3 text-lg text-sky">
            Ballots so far ({state.votes.length})
          </h3>
          {state.votes.length === 0 ? (
            <p className="text-white/40">no votes yet — everything&apos;s still up for grabs.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {state.votes.map((v) => (
                <div key={v.username} className="felt-panel rounded-2xl p-4">
                  <p className="mb-2 text-sm font-semibold text-gold/90">{v.username}</p>
                  <ol className="space-y-1 text-sm text-white/60">
                    {v.order.map((id, idx) => (
                      <li key={id}>
                        {["🥇", "🥈", "🥉"][idx] ?? `#${idx + 1}`} {restaurantById.get(id)?.name}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
