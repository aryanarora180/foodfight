"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import type { PublicState, RankedRound, Restaurant } from "@/lib/types";
import { VOTING_TYPE_LABEL } from "@/lib/gameLogic";

const SPIN_STEP_DELAYS = [70, 70, 80, 90, 100, 120, 140, 170, 210, 260, 320, 400, 500, 650];
const ROUND_STEP_MS = 1800;
const FINAL_ROUND_PAUSE_MS = 1500;

function RankedRoundsPlayback({
  rounds,
  restaurantById,
  onDone,
}: {
  rounds: RankedRound[];
  restaurantById: Map<string, Restaurant>;
  onDone: () => void;
}) {
  const [roundIdx, setRoundIdx] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const isFinalRound = roundIdx === rounds.length - 1;
    const t = setTimeout(
      () => {
        if (isFinalRound) onDone();
        else setRoundIdx((i) => i + 1);
      },
      isFinalRound ? FINAL_ROUND_PAUSE_MS : ROUND_STEP_MS
    );
    timeoutRef.current = t;
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIdx]);

  function skip() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onDone();
  }

  const round = rounds[roundIdx];
  const maxVotes = Math.max(1, ...round.counts.map((c) => c.votes));
  const isFinalRound = roundIdx === rounds.length - 1;
  const eliminatedNames = round.eliminated
    .map((id) => restaurantById.get(id)?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div>
        <p className="font-display neon-text text-xl sm:text-2xl">
          {isFinalRound && round.eliminated.length === 0
            ? "MAJORITY REACHED 🏆"
            : `ROUND ${roundIdx + 1} — INSTANT RUNOFF`}
        </p>
        <p className="mt-1 text-xs text-white/40">
          round {roundIdx + 1} of {rounds.length}
        </p>
      </div>
      <div className="felt-panel neon-border w-full max-w-md rounded-3xl p-6">
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {round.counts.map(({ restaurantId, votes }) => {
              const r = restaurantById.get(restaurantId);
              const eliminated = round.eliminated.includes(restaurantId);
              return (
                <motion.div
                  key={restaurantId}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: eliminated ? 0.4 : 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-left"
                >
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                    <span
                      className={`truncate ${eliminated ? "text-white/40 line-through" : "font-semibold"}`}
                    >
                      {r?.name ?? "?"} {eliminated && "❌"}
                    </span>
                    <span className="shrink-0 text-gold">{votes}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-black/40">
                    <motion.div
                      className={`h-full rounded-full ${
                        eliminated
                          ? "bg-white/20"
                          : "bg-gradient-to-r from-royal via-indigo to-sky"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(votes / maxVotes) * 100}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
      <p className="min-h-[1.25rem] text-sm text-white/50">
        {round.eliminated.length > 0
          ? `${eliminatedNames} eliminated — votes shift to next choice.`
          : isFinalRound
            ? "someone cleared a majority of the remaining ballots."
            : " "}
      </p>
      <button onClick={skip} className="chip-btn-ghost rounded-full px-5 py-2 text-sm">
        skip ⏭️
      </button>
    </div>
  );
}

export function ResultsPhase({ state }: { state: PublicState }) {
  const confettiFired = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const maxPoints = Math.max(1, ...state.scores.map((s) => s.points));
  const restaurantById = new Map(state.restaurants.map((r) => [r.id, r]));
  const unit = state.votingType === "points" ? "pts" : "votes";

  const hasRoundsPlayback =
    state.votingType === "ranked" &&
    Boolean(state.winner) &&
    !state.tie &&
    (state.rankedRounds?.length ?? 0) > 1;

  const canSpin =
    !hasRoundsPlayback && Boolean(state.winner) && !state.tie && state.restaurants.length > 1;

  const [stage, setStage] = useState<"rounds" | "spin" | "revealed">(
    hasRoundsPlayback ? "rounds" : canSpin ? "spin" : "revealed"
  );
  const [spinName, setSpinName] = useState(state.restaurants[0]?.name ?? "");

  useEffect(() => {
    if (stage !== "spin") return;
    const pool = state.restaurants;
    let elapsed = 0;
    SPIN_STEP_DELAYS.forEach((delay, stepIdx) => {
      elapsed += delay;
      const isLast = stepIdx === SPIN_STEP_DELAYS.length - 1;
      const t = setTimeout(() => {
        if (isLast) {
          setSpinName(state.winner!.restaurant.name);
          setStage("revealed");
        } else {
          setSpinName(pool[stepIdx % pool.length].name);
        }
      }, elapsed);
      timeoutsRef.current.push(t);
    });
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function skipSpin() {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setStage("revealed");
  }

  useEffect(() => {
    if (stage !== "revealed" || confettiFired.current) return;
    confettiFired.current = true;
    const colors = ["#ffd23f", "#2f6fed", "#38bdf8", "#1e40af", "#34d399"];
    const duration = 1400;
    const end = Date.now() + duration;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [stage]);

  if (stage === "rounds" && state.rankedRounds) {
    return (
      <RankedRoundsPlayback
        rounds={state.rankedRounds}
        restaurantById={restaurantById}
        onDone={() => setStage("revealed")}
      />
    );
  }

  if (stage === "spin") {
    return (
      <div className="flex flex-col items-center gap-6 py-10 text-center">
        <p className="font-display neon-text text-2xl sm:text-3xl">SPINNING THE REELS…</p>
        <motion.div
          animate={{ boxShadow: ["0 0 20px rgba(255,210,63,0.25)", "0 0 40px rgba(255,210,63,0.5)", "0 0 20px rgba(255,210,63,0.25)"] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="bulb-border flex w-full max-w-sm items-center justify-center gap-3 rounded-3xl border-4 border-gold/60 bg-black/60 px-6 py-10"
        >
          <span className="text-4xl">🎰</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={spinName}
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="font-display truncate text-xl text-gold sm:text-2xl"
            >
              {spinName}
            </motion.span>
          </AnimatePresence>
        </motion.div>
        <p className="animate-pulse text-sm text-white/40">the house is deciding…</p>
        <button
          onClick={skipSpin}
          className="chip-btn-ghost rounded-full px-5 py-2 text-sm"
        >
          skip ⏭️
        </button>
      </div>
    );
  }

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
          <div className="bulb-border felt-panel neon-border mx-auto inline-block rounded-3xl px-8 py-8 sm:px-14">
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
              {state.votingType === "simple" &&
                `wins with ${state.winner.points} vote${state.winner.points === 1 ? "" : "s"}.`}
              {state.votingType === "points" &&
                `wins with ${state.winner.points} points (${state.winner.firstPlaceVotes} first-place vote${state.winner.firstPlaceVotes === 1 ? "" : "s"}).`}
              {state.votingType === "ranked" &&
                `wins with ${state.winner.points} vote${state.winner.points === 1 ? "" : "s"} in the final round (${state.winner.firstPlaceVotes} first-choice vote${state.winner.firstPlaceVotes === 1 ? "" : "s"}).`}
            </p>
            <a
              href={state.winner.restaurant.url}
              target="_blank"
              rel="noreferrer"
              className="chip-btn mt-5 inline-block px-8 py-3 font-display text-lg"
            >
              VIEW THE MENU 🍽️
            </a>
          </div>
        ) : (
          <p className="text-white/50">no votes were cast.</p>
        )}
      </div>

      <div>
        <h3 className="font-display mb-1 text-lg text-sky">Final tally</h3>
        <p className="mb-3 text-xs text-white/40">via {VOTING_TYPE_LABEL[state.votingType]}</p>
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
                <span className="font-display text-gold">
                  {s.points} {unit}
                </span>
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
