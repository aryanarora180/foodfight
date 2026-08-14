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
          <button
            key={r.id}
            type="button"
            onClick={() => setSelected(r.id)}
            className={`felt-panel rounded-2xl border px-4 py-3 text-left transition ${
              selected === r.id
                ? "border-gold/70 bg-gold/10"
                : "border-white/10 hover:border-gold/40"
            }`}
          >
            <p className="font-semibold">{r.name}</p>
            <p className="text-xs text-white/40">picked by {r.submittedBy}</p>
          </button>
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
