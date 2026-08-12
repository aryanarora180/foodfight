"use client";

import { useState } from "react";
import type { PublicState } from "@/lib/types";
import { ConfirmModal } from "./ConfirmModal";

export function AdminPanel({
  state,
  onChanged,
}: {
  state: PublicState;
  onChanged: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  async function call(path: string, key: string) {
    setError(null);
    setLoading(key);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "something went wrong");
        return;
      }
      onChanged();
    } catch {
      setError("network error");
    } finally {
      setLoading(null);
    }
  }

  function confirmReset() {
    setConfirmingReset(false);
    call("/api/admin/reset", "reset");
  }

  return (
    <div className="bulb-border felt-panel neon-border rounded-3xl p-5">
      <ConfirmModal
        open={confirmingReset}
        title="reset back to bedrock?"
        message="this clears all picks and votes. accounts stay put."
        confirmLabel="reset it"
        onConfirm={confirmReset}
        onCancel={() => setConfirmingReset(false)}
      />
      <p className="font-display mb-3 text-sm tracking-wide text-royal">👑 ADMIN CONTROLS</p>
      {error && (
        <p className="mb-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {state.phase === "submission" && (
          <button
            onClick={() => call("/api/admin/start-voting", "start")}
            disabled={loading !== null || state.restaurants.length < 2}
            className="chip-btn px-5 py-2.5 text-sm"
          >
            {loading === "start" ? "BREAKING GROUND…" : "BREAK GROUND 🧱"}
          </button>
        )}
        {state.phase === "voting" && (
          <button
            onClick={() => call("/api/admin/reveal", "reveal")}
            disabled={loading !== null}
            className="chip-btn px-5 py-2.5 text-sm"
          >
            {loading === "reveal" ? "SETTING…" : "SET IT IN STONE 🪨"}
          </button>
        )}
        <button
          onClick={() => setConfirmingReset(true)}
          disabled={loading !== null}
          className="chip-btn-ghost rounded-full px-5 py-2.5 text-sm"
        >
          {loading === "reset" ? "RESETTING…" : "BACK TO BEDROCK 🪨"}
        </button>
        {state.phase === "submission" && state.restaurants.length < 2 && (
          <p className="text-xs text-white/40">need at least 2 picks before we can break ground.</p>
        )}
        {state.phase === "voting" && (
          <p className="text-xs text-white/40">
            results drop on their own once everyone&apos;s voted — this forces it early.
          </p>
        )}
      </div>
    </div>
  );
}
