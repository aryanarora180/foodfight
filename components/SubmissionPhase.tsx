"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { PublicState as State } from "@/lib/types";

export function SubmissionPhase({
  state,
  username,
  onChanged,
}: {
  state: State;
  username: string;
  onChanged: () => void;
}) {
  const mine = state.restaurants.find((r) => r.submittedBy === username);
  const [name, setName] = useState(mine?.name ?? "");
  const [url, setUrl] = useState(mine?.url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "something went wrong");
        return;
      }
      onChanged();
    } catch {
      setError("network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="felt-panel neon-border rounded-3xl p-6">
        <h2 className="font-display mb-1 text-xl text-gold">
          {mine ? "Reinforce your pick" : "Lay your foundation"}
        </h2>
        <p className="mb-5 text-sm text-white/50">
          one pick per person — reinforce it anytime before voting breaks ground.
        </p>
        <form onSubmit={submit}>
          <label className="mb-1 block text-sm font-semibold text-gold/90">Restaurant name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Big Tony's Pizza"
            required
            className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-gold/60"
          />
          <label className="mb-1 block text-sm font-semibold text-gold/90">Menu URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            required
            type="url"
            className="mb-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-gold/60"
          />
          <p className="mb-5 text-xs text-white/40">link the menu so everyone can scope it out.</p>

          {error && (
            <p className="mb-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.96 }}
            className="chip-btn w-full py-3 font-display text-lg"
          >
            {loading ? "LOCKING IN…" : mine ? "REINFORCE MY PICK 🧱" : "LOCK IN MY PICK 🧱"}
          </motion.button>
        </form>
      </div>

      <div>
        <h3 className="font-display mb-3 text-lg text-sky">
          On solid ground ({state.restaurants.length})
        </h3>
        {state.restaurants.length === 0 ? (
          <p className="text-white/40">nobody&apos;s dropped a pick yet — be the first.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <AnimatePresence>
              {state.restaurants.map((r) => (
                <motion.a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  initial={{ opacity: 0, rotateY: -90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.4 }}
                  className="felt-panel block rounded-2xl p-4 transition hover:border-gold/50"
                >
                  <p className="mb-1 text-2xl">🍽️</p>
                  <p className="font-semibold">{r.name}</p>
                  <p className="mt-1 text-xs text-white/40">picked by {r.submittedBy}</p>
                  <p className="mt-2 text-xs text-sky/70 underline">view menu →</p>
                </motion.a>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
