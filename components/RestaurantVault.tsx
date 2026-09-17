"use client";

import { useState } from "react";
import type { HistoryEntry } from "@/lib/types";
import { EditHistoryModal } from "./EditHistoryModal";
import { ConfirmModal } from "./ConfirmModal";

export function RestaurantVault({
  history,
  isAdmin,
  onChanged,
}: {
  history: HistoryEntry[];
  isAdmin: boolean;
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
        body: JSON.stringify({ id: entry.id }),
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
              <p className="truncate text-xs text-white/40">added by {entry.username}</p>
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
