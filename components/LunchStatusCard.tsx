"use client";

import { useState } from "react";
import type { PublicState } from "@/lib/types";
import { lunchStatus, type LunchStatus } from "@/lib/lunchStatus";
import { ConfirmModal } from "./ConfirmModal";

type ChoiceId = "picking" | "voting" | "away";

const CHOICES: {
  id: ChoiceId;
  icon: string;
  label: string;
  sub: string;
  status: LunchStatus;
}[] = [
  { id: "picking", icon: "🍽️", label: "picking a place", sub: "i'll choose a restaurant", status: "picked" },
  { id: "voting", icon: "🗳️", label: "just voting", sub: "no pick from me, i'll still vote", status: "just-voting" },
  { id: "away", icon: "🙅", label: "not coming", sub: "skipping lunch, no vote needed", status: "not-coming" },
];

const HEADLINE: Record<LunchStatus, { text: (pick?: string) => string; tone: string }> = {
  undecided: { text: () => "you haven't chosen yet", tone: "text-gold" },
  picked: { text: (pick) => `you picked ${pick}`, tone: "text-win" },
  "just-voting": { text: () => "you're just voting", tone: "text-sky" },
  "not-coming": { text: () => "you're not coming", tone: "text-white/50" },
};

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

// Always-visible "where do I stand" card at the top of the Vote tab. During
// submissions it's the one place to say whether you're picking a place, just
// voting, or not coming; during voting it says whether your vote is needed.
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
  const [confirmDrop, setConfirmDrop] = useState(false);

  const { status, pick } = lunchStatus(state, username);
  const me = state.users.find((u) => u.username === username);

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

  function justVote() {
    const steps: [string, unknown?][] = [];
    if (status === "not-coming") steps.push(["/api/not-coming", { value: false }]);
    if (pick) steps.push(["/api/remove-pick"]);
    steps.push(["/api/pass"]);
    return run(steps);
  }

  function choose(id: ChoiceId) {
    if (busy) return;
    if (id === "picking") {
      if (status === "not-coming") {
        const steps: [string, unknown?][] = [["/api/not-coming", { value: false }]];
        if (me?.passedSubmission) steps.push(["/api/pass", { value: false }]);
        run(steps);
      } else if (status === "just-voting") {
        run([["/api/pass", { value: false }]]);
      } else {
        document
          .getElementById("restaurant-picker")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else if (id === "voting") {
      if (status === "just-voting") return;
      if (pick) setConfirmDrop(true);
      else justVote();
    } else if (status !== "not-coming") {
      run([["/api/not-coming", { value: true }]]);
    }
  }

  if (state.phase === "results") return null;

  if (state.phase === "voting") {
    const voted = Boolean(me?.hasVoted);
    const away = status === "not-coming";
    return (
      <div className="felt-panel mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{away ? "🙅" : voted ? "✅" : "🗳️"}</span>
          <div className="leading-tight">
            <p className="text-xs font-semibold tracking-wide text-sky/80">YOUR LUNCH</p>
            <p
              className={`font-semibold ${
                away ? "text-white/50" : voted ? "text-win" : "text-gold"
              }`}
            >
              {away ? "you're not coming" : voted ? "your vote is in" : "your vote is needed"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => run([["/api/not-coming", { value: !away }]])}
          disabled={busy}
          className={`rounded-full px-4 py-1.5 text-sm disabled:opacity-40 ${
            away ? "chip-btn" : "chip-btn-ghost"
          }`}
        >
          {busy ? "…" : away ? "count me in" : "not coming?"}
        </button>
        {error && (
          <p className="w-full rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
        )}
      </div>
    );
  }

  const headline = HEADLINE[status];
  const undecided = status === "undecided";

  return (
    <div
      className={`felt-panel mb-6 rounded-3xl p-4 sm:p-5 ${
        undecided ? "!border-gold/50 shadow-[0_0_24px_rgba(255,200,60,0.12)]" : ""
      }`}
    >
      <ConfirmModal
        open={confirmDrop}
        title="drop your pick?"
        message={`${pick?.name} comes off the table. you'll just vote.`}
        confirmLabel="just vote"
        onConfirm={() => {
          setConfirmDrop(false);
          justVote();
        }}
        onCancel={() => setConfirmDrop(false)}
      />
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs font-semibold tracking-wide text-sky/80">YOUR LUNCH</p>
        <p className={`flex items-center gap-2 text-sm font-semibold ${headline.tone}`}>
          {undecided && <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />}
          {headline.text(pick?.name)}
        </p>
      </div>

      <div role="radiogroup" aria-label="your lunch plan" className="grid gap-2 sm:grid-cols-3">
        {CHOICES.map((c) => {
          const selected = status === c.status;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={busy}
              onClick={() => choose(c.id)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition disabled:opacity-60 sm:flex-col sm:items-start sm:gap-1 ${
                selected
                  ? "border-gold/70 bg-gold/10"
                  : "border-white/10 bg-black/20 hover:border-gold/40"
              }`}
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="min-w-0 flex-1 sm:flex-none">
                <span className={`block font-semibold ${selected ? "text-gold" : ""}`}>
                  {selected && "✓ "}
                  {c.label}
                </span>
                <span className="block text-xs text-white/50">{c.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</p>
      )}
    </div>
  );
}
