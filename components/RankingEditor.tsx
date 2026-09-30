"use client";

import { useRef, useState } from "react";
import { Reorder } from "framer-motion";
import type { Restaurant } from "@/lib/types";
import { PoopStorm } from "./PoopStorm";

const MEDALS = ["🥇", "🥈", "🥉", "🎗️", "🎗️", "🎗️", "🎗️", "🎗️"];

export function RankingEditor({
  restaurants,
  initialOrder,
  onSubmit,
  submitting,
  dodgyNames,
  ctaLabel = "LOCK IN MY VOTES 🔒",
}: {
  restaurants: Restaurant[];
  initialOrder: string[];
  onSubmit: (order: string[]) => void;
  submitting: boolean;
  dodgyNames: Set<string>;
  ctaLabel?: string;
}) {
  const byId = new Map(restaurants.map((r) => [r.id, r]));
  const [order, setOrder] = useState<string[]>(initialOrder);
  const [booed, setBooed] = useState<string | null>(null);
  const dragStartOrder = useRef<string[] | null>(null);

  const isDodgyId = (id: string) => {
    const r = byId.get(id);
    return Boolean(r && dodgyNames.has(r.name.trim().toLowerCase()));
  };

  // Boo when a dodgy place climbs into the top 3 (and isn't just sitting last
  // on a short list, where "last" is still top 3).
  function checkBoo(prev: string[], next: string[]) {
    const climbed = next.find(
      (id, idx) =>
        idx < 3 && idx < next.length - 1 && isDodgyId(id) && idx < prev.indexOf(id)
    );
    if (climbed) setBooed(climbed);
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...order];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrder(next);
    checkBoo(order, next);
  }

  function moveToLast(id: string) {
    setOrder([...order.filter((x) => x !== id), id]);
  }

  return (
    <div>
      <PoopStorm
        open={booed !== null}
        name={booed ? (byId.get(booed)?.name ?? "") : ""}
        primaryLabel="move it to last"
        onPrimary={() => {
          if (booed) moveToLast(booed);
          setBooed(null);
        }}
        onDismiss={() => setBooed(null)}
      />
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
              onDragStart={() => {
                dragStartOrder.current = order;
              }}
              onDragEnd={() => {
                if (dragStartOrder.current) checkBoo(dragStartOrder.current, order);
                dragStartOrder.current = null;
              }}
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
