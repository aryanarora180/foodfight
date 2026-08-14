"use client";

import { AnimatePresence, motion } from "framer-motion";

export function TempPasswordModal({
  result,
  onClose,
}: {
  result: { username: string; tempPassword: string } | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="felt-panel neon-border w-full max-w-sm rounded-3xl p-6"
          >
            <p className="font-display mb-1 text-lg text-gold">temp password ready 🔑</p>
            <p className="mb-4 text-sm text-white/50">
              share this with <span className="font-semibold text-white/80">{result.username}</span> —
              it won&apos;t be shown again. they&apos;ll have to set a real one on their next login.
            </p>
            <div className="mb-5 select-all rounded-xl border border-gold/40 bg-black/40 px-4 py-3 text-center font-mono text-lg tracking-wider text-gold">
              {result.tempPassword}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="chip-btn w-full rounded-full py-2.5 text-sm"
            >
              done
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
