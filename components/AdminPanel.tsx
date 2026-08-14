"use client";

import { useState } from "react";
import type { PublicState, VotingType } from "@/lib/types";
import { ConfirmModal } from "./ConfirmModal";
import { StartVotingModal } from "./StartVotingModal";
import { CreateUserModal } from "./CreateUserModal";
import { TempPasswordModal } from "./TempPasswordModal";

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
  const [showStartModal, setShowStartModal] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [tempPasswordResult, setTempPasswordResult] = useState<{
    username: string;
    tempPassword: string;
  } | null>(null);

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

  async function confirmStartVoting(votingType: VotingType) {
    setError(null);
    setLoading("start");
    try {
      const res = await fetch("/api/admin/start-voting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ votingType }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "something went wrong");
        return;
      }
      setShowStartModal(false);
      onChanged();
    } catch {
      setError("network error");
    } finally {
      setLoading(null);
    }
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
      <StartVotingModal
        open={showStartModal}
        onConfirm={confirmStartVoting}
        onCancel={() => setShowStartModal(false)}
        loading={loading === "start"}
      />
      <CreateUserModal
        open={showCreateUser}
        onClose={() => setShowCreateUser(false)}
        onCreated={(result) => {
          setShowCreateUser(false);
          setTempPasswordResult(result);
          onChanged();
        }}
      />
      <TempPasswordModal result={tempPasswordResult} onClose={() => setTempPasswordResult(null)} />
      <p className="font-display mb-3 text-sm tracking-wide text-royal">👑 ADMIN CONTROLS</p>
      {error && (
        <p className="mb-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {state.phase === "submission" && (
          <button
            onClick={() => setShowStartModal(true)}
            disabled={loading !== null || state.restaurants.length < 2}
            className="chip-btn px-5 py-2.5 text-sm"
          >
            BREAK GROUND 🧱
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
        <button
          onClick={() => setShowCreateUser(true)}
          disabled={loading !== null}
          className="chip-btn-ghost rounded-full px-5 py-2.5 text-sm"
        >
          + create account
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
