"use client";

import { useState } from "react";
import type { HistoryEntry } from "@/lib/types";
import { wonText } from "@/lib/recentWins";
import { EditHistoryModal } from "./EditHistoryModal";
import { ConfirmModal } from "./ConfirmModal";
import {
  dodgeTries,
  isDodgy,
  MAX_DODGE_TRIES,
  MIN_DODGE_TRIES,
} from "@/lib/rodeoGoat";

export function RestaurantVault({
  history,
  lastWon,
  isAdmin,
  onChanged,
}: {
  history: HistoryEntry[];
  lastWon?: Map<string, number>;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<HistoryEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HistoryEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingDodgy, setTogglingDodgy] = useState<string | null>(null);

  if (history.length === 0) return null;

  async function confirmDelete() {
    const entry = pendingDelete;
    setPendingDelete(null);
    if (!entry) return;
    setDeleting(true);
    try {
      await fetch("/api/admin/delete-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id }),
      });
      onChanged();
    } finally {
      setDeleting(false);
    }
  }

  async function updateDodgy(entry: HistoryEntry, change: { value?: boolean; tries?: number }) {
    setTogglingDodgy(entry.id);
    try {
      await fetch("/api/admin/set-dodgy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id, ...change }),
      });
      onChanged();
    } finally {
      setTogglingDodgy(null);
    }
  }

  return (
    <div>
      <EditHistoryModal
        entry={editing}
        onSaved={() => {
          setEditing(null);
          onChanged();
        }}
        onCancel={() => setEditing(null)}
      />
      <ConfirmModal
        open={pendingDelete !== null}
        title="forget this pick?"
        message={`${pendingDelete?.name} gets wiped from the list for good.`}
        confirmLabel="forget it"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <div className="flex flex-col gap-1">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{entry.name}</p>
              <p className="truncate text-xs text-white/40">
                added by {entry.username}
                {wonText(lastWon, entry.name) && (
                  <span className="text-gold/70"> · {wonText(lastWon, entry.name)}</span>
                )}
              </p>
              {isAdmin && isDodgy(entry) && (
                <span
                  className="mt-1 flex items-center gap-1.5 text-xs text-white/50"
                  title="how many times it runs before it lets itself be picked"
                >
                  <span>🐐 runs</span>
                  <button
                    type="button"
                    onClick={() => updateDodgy(entry, { tries: dodgeTries(entry) - 1 })}
                    disabled={togglingDodgy === entry.id || dodgeTries(entry) <= MIN_DODGE_TRIES}
                    aria-label={`fewer dodges for ${entry.name}`}
                    className="h-5 w-5 rounded-full border border-white/10 leading-none hover:text-gold disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="min-w-[3ch] text-center tabular-nums text-white/70">
                    {dodgeTries(entry)}x
                  </span>
                  <button
                    type="button"
                    onClick={() => updateDodgy(entry, { tries: dodgeTries(entry) + 1 })}
                    disabled={togglingDodgy === entry.id || dodgeTries(entry) >= MAX_DODGE_TRIES}
                    aria-label={`more dodges for ${entry.name}`}
                    className="h-5 w-5 rounded-full border border-white/10 leading-none hover:text-gold disabled:opacity-30"
                  >
                    +
                  </button>
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-3 text-xs">
              <a
                href={entry.url}
                target="_blank"
                rel="noreferrer"
                className="text-sky/70 underline"
              >
                menu
              </a>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => updateDodgy(entry, { value: !isDodgy(entry) })}
                    disabled={togglingDodgy === entry.id}
                    aria-pressed={isDodgy(entry)}
                    title={
                      isDodgy(entry)
                        ? "runs from the cursor. tap to turn off."
                        : "make it run from the cursor"
                    }
                    className={`rounded-full border px-2 py-0.5 transition disabled:opacity-40 ${
                      isDodgy(entry)
                        ? "border-gold/60 bg-gold/15 text-gold"
                        : "border-white/10 text-white/30 grayscale hover:text-white/60"
                    }`}
                  >
                    🐐 {isDodgy(entry) ? "on" : "off"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(entry)}
                    aria-label={`edit ${entry.name}`}
                    className="text-white/40 hover:text-gold"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(entry)}
                    disabled={deleting}
                    aria-label={`delete ${entry.name}`}
                    className="text-white/40 hover:text-red-300 disabled:opacity-40"
                  >
                    🗑
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
