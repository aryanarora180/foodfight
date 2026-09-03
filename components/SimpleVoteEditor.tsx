"use client";

import { useState } from "react";
import type { Restaurant } from "@/lib/types";

export function SimpleVoteEditor({
  restaurants,
  initialPick,
  onSubmit,
  submitting,
}: {
  restaurants: Restaurant[];
  initialPick: string | null;
  onSubmit: (id: string) => void;
  submitting: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(initialPick);

  return (
    <div>
      <div className="flex flex-col gap-3">
        {restaurants.map((r) => (
          <div
            key={r.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelected(r.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setSelected(r.id);
            }}
            className={`felt-panel cursor-pointer rounded-2xl border px-4 py-3 text-left transition ${
              selected === r.id
                ? "!border-gold/70 !bg-gold/10"
                : "border-white/10 hover:border-gold/40"
            }`}
          >
            <p className="font-semibold">{r.name}</p>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <span>picked by {r.submittedBy}</span>
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-sky/70 underline hover:text-sky"
              >
                view menu →
              </a>
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => selected && onSubmit(selected)}
        disabled={submitting || !selected}
        className="chip-btn mt-5 w-full py-3 font-display text-lg disabled:opacity-40"
      >
        {submitting ? "LOCKING IN…" : "LOCK IN MY VOTE 🔒"}
      </button>
    </div>
  );
}
