"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import type { PublicState } from "@/lib/types";

export function ResultsPhase({ state }: { state: PublicState }) {
  const fired = useRef(false);
  const maxPoints = Math.max(1, ...state.scores.map((s) => s.points));
  const restaurantById = new Map(state.restaurants.map((r) => [r.id, r]));

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const colors = ["#ffd23f", "#2f6fed", "#38bdf8", "#1e40af", "#34d399"];
    const duration = 1400;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        {state.tie ? (
          <>
            <p className="text-5xl">🤝</p>
            <h2 className="font-display neon-text mt-2 text-3xl sm:text-4xl">IT&apos;S A TIE!</h2>
            <p className="mt-2 text-white/60">flip a coin, roll a die, or just hit both spots.</p>
          </>
        ) : state.winner ? (
          <>
            <motion.p
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.6, duration: 0.8 }}
              className="text-6xl"
            >
              👑
            </motion.p>
            <h2 className="font-display neon-text mt-2 text-3xl sm:text-5xl">
              {state.winner.restaurant.name}
            </h2>
            <p className="mt-2 text-white/60">
              wins with {state.winner.points} points ({state.winner.firstPlaceVotes} first-place
              vote{state.winner.firstPlaceVotes === 1 ? "" : "s"}) — solid as bedrock.
            </p>
            <a
              href={state.winner.restaurant.url}
              target="_blank"
              rel="noreferrer"
              className="chip-btn mt-5 inline-block px-8 py-3 font-display text-lg"
            >
              VIEW THE MENU 🍽️
            </a>
          </>
        ) : (
          <p className="text-white/50">no votes were cast.</p>
        )}
      </div>

      <div>
        <h3 className="font-display mb-3 text-lg text-sky">Final tally</h3>
        <div className="flex flex-col gap-3">
          {state.scores.map((s, idx) => (
            <motion.div
              key={s.restaurant.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.12 }}
              className={`felt-panel rounded-2xl p-4 ${idx === 0 && !state.tie ? "neon-border" : ""}`}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <span className="font-semibold">
                  {idx === 0 && !state.tie ? "👑 " : `#${idx + 1} `}
                  {s.restaurant.name}
                </span>
                <span className="font-display text-gold">{s.points} pts</span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-black/40">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-royal via-indigo to-sky"
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.points / maxPoints) * 100}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.12, ease: "easeOut" }}
                />
              </div>
              <p className="mt-1 text-xs text-white/40">picked by {s.restaurant.submittedBy}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-display mb-3 text-lg text-sky">Everyone&apos;s ballots</h3>
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
      </div>
    </div>
  );
}
