"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import type { PublicState } from "@/lib/types";
import { lunchStatus } from "@/lib/lunchStatus";
import { NominateSheet } from "./NominateSheet";
import { UndoToast } from "./UndoToast";

// Returns an error message, or null on success.
async function call(path: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.error ?? "something went wrong";
  } catch {
    return "network error. try again.";
  }
}

const SEGMENTS = [
  { away: false, label: "Coming" },
  { away: true, label: "Not coming" },
];

function Segmented({
  away,
  disabled,
  onChange,
}: {
  away: boolean;
  disabled: boolean;
  onChange: (away: boolean) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="are you coming to lunch"
      className="relative flex rounded-full border border-white/10 bg-black/30 p-1"
    >
      {SEGMENTS.map((seg) => {
        const selected = away === seg.away;
        return (
          <button
            key={seg.label}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => !selected && onChange(seg.away)}
            className={`relative rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
              selected ? "text-gold" : "text-white/50 hover:text-white/80"
            }`}
          >
            {selected && (
              <motion.span
                layoutId="rsvp-thumb"
                transition={{ type: "spring", stiffness: 500, damping: 36 }}
                className="absolute inset-0 rounded-full border border-gold/50 bg-gold/15"
              />
            )}
            <span className="relative">{seg.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// "Where do I stand" card at the top of the Vote tab. A Coming / Not coming
// switch is always there (everyone is coming by default). Underneath, during
// submissions, there's one big action: nominate a restaurant, with a quiet
// "just vote" next to it. Once you've answered, the card shrinks to a single
// summary row. During voting it just says whether your vote is needed.
export function LunchStatusCard({
  state,
  username,
  onChanged,
}: {
  state: PublicState;
  username: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; historyId: string | null } | null>(null);

  const { status, pick } = lunchStatus(state, username);
  const me = state.users.find((u) => u.username === username);
  const away = status === "not-coming";

  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const dismissToast = useCallback(() => setToast(null), []);

  async function run(steps: [string, unknown?][]) {
    setError(null);
    setBusy(true);
    for (const [path, body] of steps) {
      const err = await call(path, body);
      if (err) {
        setError(err);
        break;
      }
    }
    setBusy(false);
    onChanged();
  }

  async function removeNomination() {
    if (!pick) return;
    const entry = state.history.find(
      (h) => h.name.trim().toLowerCase() === pick.name.trim().toLowerCase()
    );
    await run([["/api/remove-pick"]]);
    setToast({ message: `removed ${pick.name}`, historyId: entry?.id ?? null });
  }

  async function undoRemove() {
    const historyId = toast?.historyId;
    setToast(null);
    if (!historyId) return;
    await run([["/api/submit", { historyId }]]);
  }

  if (state.phase === "results") return null;

  let body: React.ReactNode = null;
  if (away) {
    body = <p className="mt-4 text-sm text-white/50">i&apos;m not joining lunch today</p>;
  } else if (state.phase === "voting") {
    const voted = Boolean(me?.hasVoted);
    body = (
      <div
        className={`mt-4 flex items-center gap-3 rounded-2xl border px-4 py-3 ${
          voted ? "border-win/30 bg-win/5" : "border-gold/40 bg-gold/5"
        }`}
      >
        <span className="text-2xl">{voted ? "✅" : "🗳️"}</span>
        <p className={`font-semibold ${voted ? "text-win" : "text-gold"}`}>
          {voted ? "your vote is in" : "your vote is needed"}
        </p>
      </div>
    );
  } else if (status === "picked" && pick) {
    body = (
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-win/30 bg-win/5 px-4 py-3">
        <span className="text-2xl">🍽️</span>
        <p className="min-w-0 flex-1 truncate font-semibold">{pick.name}</p>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          disabled={busy}
          className="chip-btn-ghost rounded-full px-4 py-1.5 text-sm disabled:opacity-40"
        >
          change
        </button>
        <button
          type="button"
          onClick={removeNomination}
          disabled={busy}
          className="rounded-full px-2 py-1.5 text-sm text-white/40 transition hover:text-red-300 disabled:opacity-40"
        >
          remove
        </button>
      </div>
    );
  } else if (status === "just-voting") {
    body = (
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-sky/30 bg-sky/5 px-4 py-3">
        <span className="text-2xl">🗳️</span>
        <p className="min-w-0 flex-1 font-semibold">you&apos;re just voting</p>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          disabled={busy}
          className="chip-btn-ghost rounded-full px-4 py-1.5 text-sm disabled:opacity-40"
        >
          nominate one
        </button>
      </div>
    );
  } else {
    body = (
      <div className="mt-4 grid gap-3 sm:grid-cols-[1.6fr_1fr]">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          disabled={busy}
          className="chip-btn w-full py-3 font-display text-lg disabled:opacity-40"
        >
          NOMINATE A RESTAURANT
        </button>
        <button
          type="button"
          onClick={() => run([["/api/pass"]])}
          disabled={busy}
          className="chip-btn-ghost w-full rounded-full py-3 text-sm font-semibold disabled:opacity-40"
        >
          just vote
        </button>
      </div>
    );
  }

  return (
    <>
      {/* fixed overlays live outside the panel so its styling can't trap them */}
      <NominateSheet
        open={sheetOpen}
        onClose={closeSheet}
        state={state}
        username={username}
        onChanged={onChanged}
      />
      <UndoToast message={toast?.message ?? null} onUndo={undoRemove} onDismiss={dismissToast} />

      <section className="felt-panel mb-6 rounded-3xl p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-wide text-sky/80">YOUR STATUS</p>
          <Segmented
            away={away}
            disabled={busy}
            onChange={(value) => run([["/api/not-coming", { value }]])}
          />
        </div>

        {body}

        {error && (
          <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}
      </section>
    </>
  );
}
