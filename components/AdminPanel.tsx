"use client";

import { useState } from "react";
import type { PublicState, VotingType } from "@/lib/types";
import { ConfirmModal } from "./ConfirmModal";
import { StartVotingModal } from "./StartVotingModal";
import { CreateUserModal } from "./CreateUserModal";
import { TempPasswordModal } from "./TempPasswordModal";

export function AdminPanel({
  state,
  username,
  onChanged,
}: {
  state: PublicState;
  username: string;
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
  const [removing, setRemoving] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [confirmingKickAll, setConfirmingKickAll] = useState(false);
  const [kickingAll, setKickingAll] = useState(false);
  const [resettingPw, setResettingPw] = useState<string | null>(null);
  const [pendingResetPw, setPendingResetPw] = useState<string | null>(null);
  const [pwResult, setPwResult] = useState<{ username: string; tempPassword: string } | null>(
    null
  );
  const [togglingNotComing, setTogglingNotComing] = useState<string | null>(null);

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
      setError("network error. try again.");
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
      setError("network error. try again.");
    } finally {
      setLoading(null);
    }
  }

  async function confirmRemove() {
    const target = pendingRemove;
    setPendingRemove(null);
    if (!target) return;
    setRemoving(target);
    try {
      await fetch("/api/admin/remove-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: target }),
      });
      onChanged();
    } finally {
      setRemoving(null);
    }
  }

  async function confirmKickAll() {
    setConfirmingKickAll(false);
    setKickingAll(true);
    try {
      await fetch("/api/admin/remove-all-users", { method: "POST" });
      onChanged();
    } finally {
      setKickingAll(false);
    }
  }

  async function confirmResetPassword() {
    const target = pendingResetPw;
    setPendingResetPw(null);
    if (!target) return;
    setResettingPw(target);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: target }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwResult({ username: data.username, tempPassword: data.tempPassword });
      }
    } finally {
      setResettingPw(null);
    }
  }

  async function toggleNotComing(target: string, value: boolean) {
    setTogglingNotComing(target);
    try {
      await fetch("/api/admin/set-not-coming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: target, value }),
      });
      onChanged();
    } finally {
      setTogglingNotComing(null);
    }
  }

  const nonAdminCount = state.users.filter((u) => !u.isAdmin).length;

  return (
    <div>
      <h2 className="font-display mb-1 text-2xl text-gold">Admin 👑</h2>
      <p className="mb-6 text-sm text-white/50">round controls and account management.</p>

      <ConfirmModal
        open={confirmingReset}
        title="reset everything?"
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
      <ConfirmModal
        open={pendingRemove !== null}
        title="kick them out?"
        message={`${pendingRemove} loses their seat. picks and votes go with them.`}
        confirmLabel="kick 'em"
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
      <ConfirmModal
        open={confirmingKickAll}
        title="kick everyone out?"
        message="every non-admin seat gets wiped. accounts, picks, and votes, all of it. can't be undone."
        confirmLabel="clear them all"
        onConfirm={confirmKickAll}
        onCancel={() => setConfirmingKickAll(false)}
      />
      <ConfirmModal
        open={pendingResetPw !== null}
        title="reset their password?"
        message={`${pendingResetPw} gets a fresh temp password and has to set a new one on their next login.`}
        confirmLabel="reset it"
        onConfirm={confirmResetPassword}
        onCancel={() => setPendingResetPw(null)}
      />
      <TempPasswordModal result={pwResult} onClose={() => setPwResult(null)} />

      {error && (
        <p className="mb-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      <div className="flex flex-col gap-4">
        <div className="felt-panel rounded-2xl p-5">
          <p className="mb-3 text-xs font-semibold tracking-wide text-sky/80">ROUND</p>
          <div className="flex flex-wrap items-center gap-3">
            {state.phase === "submission" && (
              <button
                onClick={() => setShowStartModal(true)}
                disabled={loading !== null || state.restaurants.length < 2}
                className="chip-btn px-5 py-2.5 text-sm"
              >
                START VOTING 🗳️
              </button>
            )}
            {state.phase === "voting" && (
              <button
                onClick={() => call("/api/admin/reveal", "reveal")}
                disabled={loading !== null}
                className="chip-btn px-5 py-2.5 text-sm"
              >
                {loading === "reveal" ? "REVEALING…" : "REVEAL RESULTS 🏆"}
              </button>
            )}
            {state.phase === "submission" && state.restaurants.length < 2 && (
              <p className="text-xs text-white/40">need at least 2 picks before voting can start.</p>
            )}
            {state.phase === "voting" && (
              <p className="text-xs text-white/40">
                results drop on their own once everyone&apos;s voted. this forces it early.
              </p>
            )}
            {state.phase === "results" && (
              <p className="text-xs text-white/40">
                this round is decided. reset below to start a new one.
              </p>
            )}
          </div>
        </div>

        <div className="felt-panel rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold tracking-wide text-sky/80">PEOPLE</p>
            <div className="flex items-center gap-3">
              {nonAdminCount > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmingKickAll(true)}
                  disabled={kickingAll}
                  className="text-xs text-white/40 hover:text-red-300 disabled:opacity-40"
                >
                  {kickingAll ? "clearing…" : "kick everyone"}
                </button>
              )}
              <button
                onClick={() => setShowCreateUser(true)}
                disabled={loading !== null}
                className="chip-btn-ghost rounded-full px-4 py-1.5 text-xs"
              >
                + create account
              </button>
            </div>
          </div>

          <div className="flex flex-col divide-y divide-white/5">
            {state.users.map((u) => {
              const isSelf = u.username.toLowerCase() === username.toLowerCase();
              return (
                <div key={u.username} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {u.isAdmin && "👑 "}
                      {u.username}
                    </p>
                    {u.notComing && <p className="text-xs text-white/30">not coming this round</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleNotComing(u.username, !u.notComing)}
                      disabled={togglingNotComing === u.username}
                      className="text-white/40 hover:text-sky disabled:opacity-40"
                    >
                      {u.notComing ? "count back in" : "mark not coming"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingResetPw(u.username)}
                      disabled={resettingPw === u.username}
                      className="text-white/40 hover:text-gold disabled:opacity-40"
                    >
                      reset password
                    </button>
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => setPendingRemove(u.username)}
                        disabled={removing === u.username}
                        className="text-white/40 hover:text-red-300 disabled:opacity-40"
                      >
                        remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="felt-panel rounded-2xl p-5">
          <p className="mb-3 text-xs font-semibold tracking-wide text-red-300/70">DANGER ZONE</p>
          <button
            onClick={() => setConfirmingReset(true)}
            disabled={loading !== null}
            className="rounded-full border border-red-500/20 px-5 py-2.5 text-sm text-red-300/80 transition hover:border-red-500/40 hover:text-red-300 disabled:opacity-40"
          >
            {loading === "reset" ? "resetting…" : "reset everything ↺"}
          </button>
          <p className="mt-2 text-xs text-white/30">
            clears all picks and votes and returns to submissions. accounts and history stay put.
          </p>
        </div>
      </div>
    </div>
  );
}
