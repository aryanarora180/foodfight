"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import type { HistoryEntry } from "@/lib/types";
import { dodgeTries } from "@/lib/rodeoGoat";

// Rodeo Goat runs away from the cursor in the pick list. It gives up after
// a set number of dodges (admin-configurable) so it's annoying to pick, not
// impossible.
const TAUNTS = ["nope 🐐", "too slow", "nice try", "not today", "pls no", "over here", "😭😭😭"];
const TIRED = "ok fine 😮‍💨";
const NEAR_PX = 40;
const COOLDOWN_MS = 180;

type Pos = { x: number; y: number };

export function DodgyGoatChip({
  entry,
  onPick,
  disabled,
  busy,
}: {
  entry: HistoryEntry;
  onPick: () => void;
  disabled: boolean;
  busy: boolean;
}) {
  const inlineRef = useRef<HTMLButtonElement>(null);
  const floatRef = useRef<HTMLButtonElement>(null);
  const lastDodge = useRef(0);
  const suppressClick = useRef(false);
  const [start, setStart] = useState<Pos | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [dodges, setDodges] = useState(0);

  const tired = dodges >= dodgeTries(entry);

  function dodge(pointer: Pos) {
    if (tired || disabled) return;
    const now = Date.now();
    if (now - lastDodge.current < COOLDOWN_MS) return;
    lastDodge.current = now;

    const el = floatRef.current ?? inlineRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = rect.width + 24;
    const h = rect.height + 8;
    const maxX = Math.max(16, window.innerWidth - w - 16);
    const maxY = Math.max(16, window.innerHeight - h - 16);

    let best: Pos = { x: 16, y: 16 };
    let bestDist = -1;
    for (let i = 0; i < 12; i++) {
      const cand = { x: 16 + Math.random() * (maxX - 16), y: 16 + Math.random() * (maxY - 16) };
      const dist = Math.hypot(cand.x + w / 2 - pointer.x, cand.y + h / 2 - pointer.y);
      if (dist > 260) {
        best = cand;
        break;
      }
      if (dist > bestDist) {
        best = cand;
        bestDist = dist;
      }
    }

    if (!pos) setStart({ x: rect.left, y: rect.top });
    setPos(best);
    setDodges((d) => d + 1);
  }

  // Once it's loose, dodge whenever the cursor gets close.
  useEffect(() => {
    if (!pos || tired || disabled) return;
    function onMove(e: PointerEvent) {
      if (e.pointerType !== "mouse") return;
      const el = floatRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (
        e.clientX > r.left - NEAR_PX &&
        e.clientX < r.right + NEAR_PX &&
        e.clientY > r.top - NEAR_PX &&
        e.clientY < r.bottom + NEAR_PX
      ) {
        dodge({ x: e.clientX, y: e.clientY });
      }
    }
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  });

  function handlePointerEnter(e: React.PointerEvent) {
    if (e.pointerType === "mouse") dodge({ x: e.clientX, y: e.clientY });
  }

  // Touch has no hover, so the first few taps make it run instead of picking.
  function handlePointerDown(e: React.PointerEvent) {
    suppressClick.current = e.pointerType !== "mouse" && !tired && !disabled;
    if (suppressClick.current) dodge({ x: e.clientX, y: e.clientY });
  }

  function handleClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onPick();
  }

  const label = busy ? "…" : tired ? TIRED : dodges === 0 ? entry.name : TAUNTS[(dodges - 1) % TAUNTS.length];

  if (!pos) {
    return (
      <button
        ref={inlineRef}
        type="button"
        disabled={disabled}
        onPointerEnter={handlePointerEnter}
        onPointerDown={handlePointerDown}
        onClick={handleClick}
        className="px-4 py-2 hover:opacity-80 disabled:cursor-not-allowed"
      >
        {label}
      </button>
    );
  }

  return (
    <>
      <span className="px-4 py-2 italic text-white/30">{entry.name} ran off</span>
      {createPortal(
        <motion.button
          ref={floatRef}
          type="button"
          disabled={disabled}
          onPointerEnter={handlePointerEnter}
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          initial={{ left: start?.x ?? pos.x, top: start?.y ?? pos.y }}
          animate={{ left: pos.x, top: pos.y, rotate: tired ? 0 : [0, -10, 10, 0] }}
          transition={{
            left: { type: "spring", stiffness: 420, damping: 26 },
            top: { type: "spring", stiffness: 420, damping: 26 },
            rotate: { duration: 0.35, ease: "easeInOut" },
          }}
          style={{ position: "fixed" }}
          className="z-40 whitespace-nowrap rounded-full border border-gold/60 bg-black/80 px-4 py-2 text-sm font-medium text-gold shadow-lg shadow-black/50 disabled:cursor-not-allowed"
        >
          {label}
        </motion.button>,
        document.body
      )}
    </>
  );
}
