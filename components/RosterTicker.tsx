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
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  if (users.length === 0) return null;
  const label = phase === "submission" ? "locked in a pick" : "voted";
  const active = users.filter((u) => !u.notComing);
  const notComingUsers = users.filter((u) => u.notComing);
  const doneCount = active.filter((u) => (phase === "submission" ? u.hasSubmitted : u.hasVoted))
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

  function renderTile(u: PublicUser) {
    const done = phase === "submission" ? u.hasSubmitted : u.hasVoted;
    const passed = phase === "submission" && u.passedSubmission;
    const isSelf = u.username.toLowerCase() === username.toLowerCase();
    const menuOpen = openMenuFor === u.username;
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
        className={`relative flex min-w-[112px] flex-col gap-1 rounded-xl border px-3 py-2 ${
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
          {isAdmin && (
            <button
              type="button"
              onClick={() => setOpenMenuFor(menuOpen ? null : u.username)}
              aria-label={`actions for ${u.username}`}
              className="shrink-0 rounded-md px-1 leading-none text-white/40 hover:bg-white/10 hover:text-white/80"
            >
              ⋯
            </button>
          )}
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

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuFor(null)} />
            <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-lg border border-white/10 bg-[#0b1c33] py-1 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  toggleNotComing(u.username, !u.notComing);
                  setOpenMenuFor(null);
                }}
                disabled={togglingNotComing === u.username}
                className="block w-full px-3 py-2 text-left text-xs text-white/70 hover:bg-white/10 disabled:opacity-40"
              >
                {u.notComing ? "↩️ count back in" : "🙅 mark as not coming"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingResetPw(u.username);
                  setOpenMenuFor(null);
                }}
                disabled={resettingPw === u.username}
                className="block w-full px-3 py-2 text-left text-xs text-white/70 hover:bg-white/10 disabled:opacity-40"
              >
                🔑 reset password
              </button>
              {!isSelf && (
                <button
                  type="button"
                  onClick={() => {
                    setPendingRemove(u.username);
                    setOpenMenuFor(null);
                  }}
                  disabled={removing === u.username}
                  className="block w-full px-3 py-2 text-left text-xs text-red-300/80 hover:bg-red-500/10 disabled:opacity-40"
                >
                  × remove from round
                </button>
              )}
            </div>
          </>
        )}
      </div>
    );
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
          WHO&apos;S {phase === "submission" ? "IN" : "VOTED"} ({doneCount}/{active.length})
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
      <div className="flex flex-wrap gap-2">{active.map(renderTile)}</div>

      {notComingUsers.length > 0 && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <p className="mb-2 text-xs font-semibold tracking-wide text-white/30">
            NOT COMING ({notComingUsers.length})
          </p>
          <div className="flex flex-wrap gap-2">{notComingUsers.map(renderTile)}</div>
        </div>
      )}
    </div>
  );
}
