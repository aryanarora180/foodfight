"use client";

import { AnimatePresence, motion } from "framer-motion";

export function RodeoGoatModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: [0, -4, 4, -2, 0] }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "tween", duration: 0.45 }}
            onClick={(e) => e.stopPropagation()}
            className="felt-panel neon-border w-full max-w-sm rounded-3xl p-6 text-center"
          >
            <p className="mb-3 text-5xl">🐐</p>
            <p className="font-display mb-6 text-2xl text-gold">pls not again😭😭😭</p>
            <button
              type="button"
              onClick={onClose}
              className="chip-btn rounded-full px-6 py-2 text-sm"
            >
              ok fine
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
