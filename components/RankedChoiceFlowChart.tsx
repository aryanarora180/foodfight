"use client";

import type { RankedRound, Restaurant } from "@/lib/types";

// Validated categorical palette (dark mode, fixed hue order) — see the
// project's dataviz pass: all 8 slots clear lightness band, chroma floor,
// CVD separation (adjacent ΔE ≥ 8), normal-vision floor (≥ 15), and ≥3:1
// contrast against this app's felt surface (#0b2038). Color follows each
// restaurant's identity, never its rank, so a bar keeps its color as it
// climbs or fades across rounds.
const PALETTE = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
];

export function rankedCandidateColors(rounds: RankedRound[]): Map<string, string> {
  const candidateOrder = rounds[0]?.counts.map((c) => c.restaurantId) ?? [];
  return new Map(candidateOrder.map((id, idx) => [id, PALETTE[idx % PALETTE.length]]));
}

export function RankedChoiceFlowChart({
  rounds,
  restaurantById,
}: {
  rounds: RankedRound[];
  restaurantById: Map<string, Restaurant>;
}) {
  if (rounds.length < 2) return null;

  const candidateOrder = rounds[0].counts.map((c) => c.restaurantId);
  const colorFor = rankedCandidateColors(rounds);
  const sharedMax = Math.max(1, ...rounds.flatMap((r) => r.counts.map((c) => c.votes)));

  return (
    <div>
      <h3 className="font-display mb-1 text-lg text-sky">How the runoff played out</h3>
      <p className="mb-4 text-xs text-white/40">
        each round, the lowest pick is eliminated and its ballots move to whoever&apos;s next on
        those votes until someone clears a majority.
      </p>

      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {candidateOrder.map((id) => (
          <div key={id} className="flex items-center gap-1.5 text-xs text-white/60">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colorFor.get(id) }}
            />
            <span className="truncate">{restaurantById.get(id)?.name ?? "?"}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {rounds.map((round, roundIdx) => {
          const isFinal = roundIdx === rounds.length - 1;
          const eliminatedNames = round.eliminated
            .map((id) => restaurantById.get(id)?.name)
            .filter(Boolean)
            .join(", ");

          return (
            <div key={roundIdx}>
              <div
                className={`felt-panel rounded-2xl p-4 ${isFinal && round.eliminated.length === 0 ? "neon-border" : ""}`}
              >
                <div className="mb-3 flex items-baseline justify-between">
                  <p className="text-xs font-semibold tracking-wide text-sky/80">
                    ROUND {roundIdx + 1}
                  </p>
                  {isFinal && round.eliminated.length === 0 && (
                    <p className="text-xs font-semibold text-gold">majority reached</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {round.counts.map(({ restaurantId, votes }) => {
                    const eliminated = round.eliminated.includes(restaurantId);
                    const color = colorFor.get(restaurantId) ?? "#888";
                    return (
                      <div key={restaurantId} title={`${votes} vote${votes === 1 ? "" : "s"}`}>
                        <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
                          <span
                            className={`truncate ${eliminated ? "text-white/35 line-through" : "text-white/80"}`}
                          >
                            {restaurantById.get(restaurantId)?.name ?? "?"}
                            {eliminated && " · eliminated"}
                          </span>
                          <span
                            className={`shrink-0 font-semibold ${eliminated ? "text-white/30" : "text-white"}`}
                          >
                            {votes}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-black/40">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(votes / sharedMax) * 100}%`,
                              backgroundColor: color,
                              opacity: eliminated ? 0.3 : 1,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!isFinal && (
                <div className="flex flex-col items-center py-1.5 text-center text-xs text-white/40">
                  <span aria-hidden className="leading-none text-white/20">
                    ↓
                  </span>
                  {round.eliminated.length > 0 && (
                    <span>{eliminatedNames} out. ballots move to the next choice.</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
