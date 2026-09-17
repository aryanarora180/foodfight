"use client";

import { useState } from "react";
import type { Phase, PublicUser } from "@/lib/types";
import { ConfirmModal } from "./ConfirmModal";
import { TempPasswordModal } from "./TempPasswordModal";

export function RosterTicker({
  users,
  phase,
  isAdmin,
  username,
  onChanged,
}: {
  users: PublicUser[];
  phase: Phase;
  isAdmin: boolean;
  username: string;
  onChanged: () => void;
}) {
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

  if (users.length === 0) return null;
  const label = phase === "submission" ? "locked in a pick" : "voted";
  const counted = users.filter((u) => !u.notComing);
  const doneCount = counted.filter((u) => (phase === "submission" ? u.hasSubmitted : u.hasVoted))
    .length;
  const nonAdminCount = users.filter((u) => !u.isAdmin).length;

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
      const isSelf = target.toLowerCase() === username.toLowerCase();
      const endpoint = isSelf ? "/api/not-coming" : "/api/admin/set-not-coming";
      const body = isSelf ? { value } : { username: target, value };
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onChanged();
    } finally {
      setTogglingNotComing(null);
    }
  }

  return (
    <div className="felt-panel rounded-2xl px-4 py-3">
      <ConfirmModal
        open={pendingRemove !== null}
        title="kick them out?"
        message={`${pendingRemove} loses their seat — picks and votes go with them.`}
        confirmLabel="kick 'em"
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
      <ConfirmModal
        open={confirmingKickAll}
        title="kick everyone out?"
        message="every non-admin seat gets wiped — accounts, picks, and votes, all of it. can't be undone."
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
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-sky/80">
          WHO&apos;S {phase === "submission" ? "IN" : "VOTED"} ({doneCount}/{counted.length})
        </p>
        {isAdmin && nonAdminCount > 0 && (
          <button
            type="button"
            onClick={() => setConfirmingKickAll(true)}
            disabled={kickingAll}
            className="text-xs text-white/40 hover:text-red-300 disabled:opacity-40"
          >
            {kickingAll ? "clearing…" : "kick everyone 🧹"}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {users.map((u) => {
          const done = phase === "submission" ? u.hasSubmitted : u.hasVoted;
          const passed = phase === "submission" && u.passedSubmission;
          const isSelf = u.username.toLowerCase() === username.toLowerCase();
          const statusText = u.notComing
            ? "not coming 🙅"
            : passed
              ? "sitting out 🤷"
              : done
                ? `${label} ✓`
                : "waiting …";
          return (
            <div
              key={u.username}
              className={`flex min-w-[112px] flex-col gap-1 rounded-xl border px-3 py-2 ${
                u.notComing
                  ? "border-white/5 bg-white/[0.03] opacity-60"
                  : done
                    ? "border-win/30 bg-win/10"
                    : passed
                      ? "border-gold/25 bg-gold/5"
                      : "border-white/10 bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold">
                  {u.isAdmin && "👑"}
                  {u.username}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {(isSelf || isAdmin) && (
                    <button
                      type="button"
                      onClick={() => toggleNotComing(u.username, !u.notComing)}
                      disabled={togglingNotComing === u.username}
                      aria-label={
                        u.notComing ? `count ${u.username} back in` : `mark ${u.username} as not coming`
                      }
                      title={u.notComing ? "count back in" : "mark as not coming"}
                      className="leading-none text-white/40 hover:text-sky disabled:opacity-40"
                    >
                      {u.notComing ? "↩️" : "🙅"}
                    </button>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPendingResetPw(u.username)}
                        disabled={resettingPw === u.username}
                        aria-label={`reset ${u.username}'s password`}
                        className="leading-none text-white/40 hover:text-gold disabled:opacity-40"
                      >
                        🔑
                      </button>
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => setPendingRemove(u.username)}
                          disabled={removing === u.username}
                          aria-label={`remove ${u.username}`}
                          className="leading-none text-white/40 hover:text-red-300 disabled:opacity-40"
                        >
                          ×
                        </button>
                      )}
                    </>
                  )}
                </span>
              </div>
              <span
                className={`text-xs ${
                  u.notComing
                    ? "text-white/30"
                    : done
                      ? "text-win"
                      : passed
                        ? "text-gold/80"
                        : "text-white/40"
                }`}
              >
                {statusText}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
