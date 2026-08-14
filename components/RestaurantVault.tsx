"use client";

import { useState } from "react";
import type { HistoryEntry } from "@/lib/types";
import { EditHistoryModal } from "./EditHistoryModal";
import { ConfirmModal } from "./ConfirmModal";

export function RestaurantVault({
  history,
  isAdmin,
  currentNames,
  onPick,
  onChanged,
}: {
  history: HistoryEntry[];
  isAdmin: boolean;
  currentNames: Set<string>;
  onPick: (entry: HistoryEntry) => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<HistoryEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HistoryEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        body: JSON.stringify({ username: entry.username }),
      });
      onChanged();
    } finally {
      setDeleting(false);
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
        message={`${pendingDelete?.name} gets wiped from the vault for good.`}
        confirmLabel="forget it"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <h3 className="font-display mb-1 text-lg text-sky">The vault 🗄️</h3>
      <p className="mb-3 text-xs text-white/40">
        old favorites, ready to bring back with one click.
      </p>
      <div className="flex flex-wrap gap-2">
        {history.map((entry) => {
          const inPlay = currentNames.has(entry.name.trim().toLowerCase());
          return (
            <div
              key={entry.username}
              className="felt-panel flex items-center gap-2 rounded-full py-1.5 pl-4 pr-2 text-sm"
            >
              <button
                type="button"
                onClick={() => onPick(entry)}
                disabled={inPlay}
                title={inPlay ? `${entry.name} is already on the table this round` : `use ${entry.name}`}
                className="font-medium disabled:cursor-not-allowed disabled:text-white/30"
              >
                {entry.name}
                <span className="ml-1.5 text-xs text-white/40">— {entry.username}</span>
              </button>
              {isAdmin && (
                <span className="flex items-center gap-1 border-l border-white/10 pl-2">
                  <button
                    type="button"
                    onClick={() => setEditing(entry)}
                    aria-label={`edit ${entry.name} in vault`}
                    className="text-white/40 hover:text-gold"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(entry)}
                    disabled={deleting}
                    aria-label={`delete ${entry.name} from vault`}
                    className="text-white/40 hover:text-red-300 disabled:opacity-40"
                  >
                    🗑
                  </button>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
