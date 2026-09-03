"use client";

import { useState } from "react";
import { Reorder } from "framer-motion";
import type { Restaurant } from "@/lib/types";

const MEDALS = ["🥇", "🥈", "🥉", "🎗️", "🎗️", "🎗️", "🎗️", "🎗️"];

export function RankingEditor({
  restaurants,
  initialOrder,
  onSubmit,
  submitting,
  ctaLabel = "LOCK IN MY VOTES 🔒",
}: {
  restaurants: Restaurant[];
  initialOrder: string[];
  onSubmit: (order: string[]) => void;
  submitting: boolean;
  ctaLabel?: string;
}) {
  const byId = new Map(restaurants.map((r) => [r.id, r]));
  const [order, setOrder] = useState<string[]>(initialOrder);

  function move(idx: number, dir: -1 | 1) {
    const next = [...order];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
  }

  return (
    <div>
      <Reorder.Group
        axis="y"
        values={order}
        onReorder={setOrder}
        className="flex flex-col gap-3"
      >
        {order.map((id, idx) => {
          const r = byId.get(id);
          if (!r) return null;
          return (
            <Reorder.Item
              key={id}
              value={id}
              whileDrag={{ scale: 1.03, boxShadow: "0 14px 32px rgba(0,0,0,0.55)" }}
              className="felt-panel flex cursor-grab items-center gap-3 rounded-2xl px-4 py-3 active:cursor-grabbing sm:gap-4"
            >
              <span className="w-9 shrink-0 text-center text-2xl">
                {MEDALS[idx] ?? `#${idx + 1}`}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.name}</p>
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <span className="truncate">picked by {r.submittedBy}</span>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 text-sky/70 underline hover:text-sky"
                  >
                    view menu →
                  </a>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  aria-label="Move up"
                  className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/60 hover:bg-white/10 disabled:opacity-20"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(idx, 1)}
                  disabled={idx === order.length - 1}
                  aria-label="Move down"
                  className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/60 hover:bg-white/10 disabled:opacity-20"
                >
                  ▼
                </button>
              </div>
              <span className="hidden shrink-0 select-none text-white/25 sm:block">⠿</span>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
      <button
        onClick={() => onSubmit(order)}
        disabled={submitting}
        className="chip-btn mt-5 w-full py-3 font-display text-lg"
      >
        {submitting ? "LOCKING IN…" : ctaLabel}
      </button>
    </div>
  );
}
