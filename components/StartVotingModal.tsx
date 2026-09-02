"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { VotingType } from "@/lib/types";

const OPTIONS: { type: VotingType; emoji: string; label: string; blurb: string }[] = [
  {
    type: "simple",
    emoji: "🗳️",
    label: "Simple",
    blurb: "everyone picks one favorite — most votes wins.",
  },
  {
    type: "points",
    emoji: "📊",
    label: "Points",
    blurb: "rank them all — 1st place scores highest, points decide the winner.",
  },
  {
    type: "ranked",
    emoji: "🏆",
    label: "Ranked choice",
    blurb: "rank them all — lowest pick gets eliminated round by round until someone has a majority.",
  },
];

export function StartVotingModal({
  open,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  onConfirm: (type: VotingType) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [selected, setSelected] = useState<VotingType>("points");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="felt-panel neon-border w-full max-w-md rounded-3xl p-6"
          >
            <p className="font-display mb-1 text-lg text-gold">how are we voting?</p>
            <p className="mb-4 text-xs text-white/40">pick a format before voting starts.</p>
            <div className="mb-5 flex flex-col gap-2">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setSelected(opt.type)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    selected === opt.type
                      ? "border-gold/70 bg-gold/10"
                      : "border-white/10 bg-black/20 hover:border-white/25"
                  }`}
                >
                  <p className="font-semibold">
                    {opt.emoji} {opt.label}
                  </p>
                  <p className="mt-0.5 text-xs text-white/50">{opt.blurb}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="chip-btn-ghost rounded-full px-5 py-2 text-sm"
              >
                cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(selected)}
                disabled={loading}
                className="chip-btn rounded-full px-5 py-2 text-sm disabled:opacity-40"
              >
                {loading ? "starting…" : "START VOTING 🗳️"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
