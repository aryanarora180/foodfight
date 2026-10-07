"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { REACTION_EMOJI, type Restaurant } from "@/lib/types";
import { play } from "@/lib/sound";

// Reactions bump a local counter straight away and settle once the server
// answers, so mashing an emoji feels instant.
export function useReactions(onChanged: () => void) {
  const [pending, setPending] = useState<Record<string, number>>({});

  async function react(restaurantId: string, emoji: string) {
    const key = `${restaurantId}:${emoji}`;
    play("pop");
    setPending((p) => ({ ...p, [key]: (p[key] ?? 0) + 1 }));
    try {
      await fetch("/api/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, emoji }),
      });
      onChanged();
    } finally {
      setPending((p) => ({ ...p, [key]: Math.max(0, (p[key] ?? 0) - 1) }));
    }
  }

  return { pending, react };
}

export function ReactionBar({
  restaurant,
  pending,
  readOnly,
  onReact,
  className = "mt-3",
}: {
  restaurant: Restaurant;
  pending: Record<string, number>;
  readOnly: boolean;
  onReact: (restaurantId: string, emoji: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {REACTION_EMOJI.map((emoji) => {
        const total =
          (restaurant.reactions?.[emoji] ?? 0) + (pending[`${restaurant.id}:${emoji}`] ?? 0);
        return (
          <motion.button
            key={emoji}
            type="button"
            onClick={() => onReact(restaurant.id, emoji)}
            disabled={readOnly}
            whileTap={readOnly ? undefined : { scale: 0.8 }}
            className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs transition enabled:hover:border-gold/40 enabled:hover:bg-gold/10 enabled:active:border-gold/60 disabled:cursor-default disabled:opacity-60"
          >
            <span>{emoji}</span>
            {total > 0 && (
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={total}
                  initial={{ y: -6, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 6, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-white/50"
                >
                  {total}
                </motion.span>
              </AnimatePresence>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
