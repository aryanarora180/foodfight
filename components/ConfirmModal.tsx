"use client";

import { AnimatePresence, motion } from "framer-motion";

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "confirm",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
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
            className="felt-panel neon-border w-full max-w-sm rounded-3xl p-6"
          >
            {title && <p className="font-display mb-2 text-lg text-gold">{title}</p>}
            <p className="mb-6 text-sm text-white/70">{message}</p>
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
                onClick={onConfirm}
                className="chip-btn rounded-full px-5 py-2 text-sm"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
