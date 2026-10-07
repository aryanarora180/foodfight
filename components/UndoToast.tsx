"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

// A small bottom toast with an Undo button, instead of a confirm dialog.
// Dismisses itself after a few seconds.
export function UndoToast({
  message,
  onUndo,
  onDismiss,
}: {
  message: string | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          role="status"
          className="felt-panel neon-border fixed inset-x-4 bottom-20 z-[60] mx-auto flex max-w-sm items-center justify-between gap-4 rounded-2xl px-4 py-3 text-sm lg:bottom-6"
        >
          <span className="min-w-0 truncate">{message}</span>
          <button
            type="button"
            onClick={onUndo}
            className="shrink-0 font-semibold text-gold hover:underline"
          >
            undo
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
