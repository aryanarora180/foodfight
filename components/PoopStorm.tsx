"use client";

import { AnimatePresence, motion } from "framer-motion";

// Deterministic scatter so render stays pure. Enough poop to fill the screen.
const DROPS = Array.from({ length: 90 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 24 + ((i * 13) % 5) * 10,
  delay: ((i * 17) % 20) / 10,
  duration: 2.2 + ((i * 7) % 10) / 5,
  spin: ((i * 29) % 2 === 0 ? 1 : -1) * (90 + ((i * 11) % 4) * 90),
}));

export function PoopStorm({
  name,
  open,
  primaryLabel,
  onPrimary,
  onDismiss,
}: {
  name: string;
  open: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 overflow-hidden bg-black/75"
          onClick={onDismiss}
        >
          {DROPS.map((d, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="pointer-events-none absolute top-0 select-none"
              style={{ left: `${d.left}%`, fontSize: d.size }}
              initial={{ y: "-15vh", rotate: 0 }}
              animate={{ y: "110vh", rotate: d.spin }}
              transition={{
                duration: d.duration,
                delay: d.delay,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              💩
            </motion.span>
          ))}
          <div className="relative flex h-full items-center justify-center px-4">
            <motion.div
              initial={{ scale: 0.5, rotate: -6 }}
              animate={{ scale: [0.5, 1.15, 1], rotate: [-6, 4, 0] }}
              transition={{ type: "tween", duration: 0.5 }}
              onClick={(e) => e.stopPropagation()}
              className="felt-panel neon-border w-full max-w-md rounded-3xl p-6 text-center"
            >
              <p className="mb-2 text-6xl">💩</p>
              <p className="font-display mb-6 text-3xl text-gold">boo not {name}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={onPrimary}
                  className="chip-btn rounded-full px-5 py-2 text-sm"
                >
                  {primaryLabel}
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="chip-btn-ghost rounded-full px-5 py-2 text-sm"
                >
                  keep it anyway
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
