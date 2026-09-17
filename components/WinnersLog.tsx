"use client";

import { useState } from "react";
import type { WinnerRecord } from "@/lib/types";
import { VOTING_TYPE_LABEL } from "@/lib/gameLogic";
import { ConfirmModal } from "./ConfirmModal";

function topBy(entries: WinnerRecord[], keyFn: (w: WinnerRecord) => string) {
  const counts = new Map<string, number>();
  for (const w of entries) {
    const key = keyFn(w);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
}

export function WinnersLog({
  winnerHistory,
  isAdmin,
  onChanged,
}: {
  winnerHistory: WinnerRecord[];
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<WinnerRecord | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function confirmDelete() {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    setDeleting(target.id);
    try {
      await fetch("/api/admin/delete-winner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: target.id }),
      });
      onChanged();
    } finally {
      setDeleting(null);
    }
  }

  if (winnerHistory.length === 0) {
    return (
      <div className="felt-panel rounded-2xl p-8 text-center">
        <p className="mb-1 text-3xl">🏆</p>
        <p className="text-sm text-white/50">
          no winners crowned yet. finish a round to start the hall of fame.
        </p>
      </div>
    );
  }

  const topRestaurants = topBy(winnerHistory, (w) => w.name);
  const topSubmitters = topBy(winnerHistory, (w) => w.submittedBy);
  const medal = (idx: number) => ["🥇", "🥈", "🥉"][idx] ?? `#${idx + 1}`;

  return (
    <div className="flex flex-col gap-6">
      <ConfirmModal
        open={pendingDelete !== null}
        title="remove this win?"
        message={`${pendingDelete?.name} loses its spot in the hall of fame. can't be undone.`}
        confirmLabel="remove it"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="felt-panel neon-border rounded-3xl p-6 text-center">
          <p className="mb-2 text-xs font-semibold tracking-wide text-sky/80">TOP RESTAURANT</p>
          <p className="font-display neon-text truncate text-2xl sm:text-3xl">
            {topRestaurants[0][0]}
          </p>
          <p className="mt-1 text-sm text-white/50">
            {topRestaurants[0][1]} win{topRestaurants[0][1] === 1 ? "" : "s"}
          </p>
          {topRestaurants.length > 1 && (
            <div className="mt-4 flex flex-col gap-1 border-t border-white/5 pt-3 text-left">
              {topRestaurants.slice(1).map(([name, count], idx) => (
                <div key={name} className="flex items-center justify-between gap-2 text-xs text-white/50">
                  <span className="truncate">
                    {medal(idx + 1)} {name}
                  </span>
                  <span className="shrink-0 text-gold">{count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="felt-panel neon-border rounded-3xl p-6 text-center">
          <p className="mb-2 text-xs font-semibold tracking-wide text-sky/80">TOP PICKER</p>
          <p className="font-display neon-text truncate text-2xl sm:text-3xl">
            {topSubmitters[0][0]}
          </p>
          <p className="mt-1 text-sm text-white/50">
            {topSubmitters[0][1]} win{topSubmitters[0][1] === 1 ? "" : "s"}
          </p>
          {topSubmitters.length > 1 && (
            <div className="mt-4 flex flex-col gap-1 border-t border-white/5 pt-3 text-left">
              {topSubmitters.slice(1).map(([name, count], idx) => (
                <div key={name} className="flex items-center justify-between gap-2 text-xs text-white/50">
                  <span className="truncate">
                    {medal(idx + 1)} {name}
                  </span>
                  <span className="shrink-0 text-gold">{count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold tracking-wide text-sky/80">
          FULL HISTORY ({winnerHistory.length})
        </p>
        <div className="flex flex-col gap-2">
          {winnerHistory.map((w) => (
            <div
              key={w.id}
              className="felt-panel flex items-center justify-between gap-3 rounded-2xl p-4"
            >
              <div className="min-w-0">
                <a
                  href={w.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-gold/90 underline-offset-2 hover:underline"
                >
                  {w.name}
                </a>
                <p className="mt-0.5 text-xs text-white/40">
                  picked by {w.submittedBy} · {VOTING_TYPE_LABEL[w.votingType]} · {w.points}{" "}
                  {w.votingType === "points" ? "pts" : "votes"} · {w.participantCount} voted
                </p>
                <p className="mt-0.5 text-xs text-white/30">
                  {new Date(w.decidedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setPendingDelete(w)}
                  disabled={deleting === w.id}
                  aria-label={`remove ${w.name} from history`}
                  className="shrink-0 text-white/30 hover:text-red-300 disabled:opacity-40"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
