"use client";

import { useState } from "react";
import type { PublicState } from "@/lib/types";

export function AdminPanel({
  state,
  onChanged,
}: {
  state: PublicState;
  onChanged: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, key: string) {
    setError(null);
    setLoading(key);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      onChanged();
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  function reset() {
    if (!window.confirm("Reset the whole game? This clears all picks and votes.")) return;
    call("/api/admin/reset", "reset");
  }

  return (
    <div className="bulb-border felt-panel neon-border rounded-3xl p-5">
      <p className="font-display mb-3 text-sm tracking-wide text-magenta">👑 ADMIN CONTROLS</p>
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
            {loading === "start" ? "STARTING…" : "START VOTING 🗳️"}
          </button>
        )}
        {state.phase === "voting" && (
          <button
            onClick={() => call("/api/admin/reveal", "reveal")}
            disabled={loading !== null}
            className="chip-btn px-5 py-2.5 text-sm"
          >
            {loading === "reveal" ? "REVEALING…" : "REVEAL WINNER 🎉"}
          </button>
        )}
        <button
          onClick={reset}
          disabled={loading !== null}
          className="chip-btn-ghost rounded-full px-5 py-2.5 text-sm"
        >
          {loading === "reset" ? "RESETTING…" : "RESET GAME 🔄"}
        </button>
        {state.phase === "submission" && state.restaurants.length < 2 && (
          <p className="text-xs text-white/40">Need at least 2 picks before voting can start.</p>
        )}
      </div>
    </div>
  );
}
