"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      onLoggedIn();
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  const decorations = ["🎰", "🍕", "🌮", "🍔", "🎲", "🍜", "🥡", "🎟️"];

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0">
        {decorations.map((emoji, i) => (
          <span
            key={emoji}
            className="float-slow absolute text-4xl opacity-20 sm:text-5xl"
            style={{
              left: `${(i * 37) % 92}%`,
              top: `${(i * 53) % 88}%`,
              animationDelay: `${i * 0.4}s`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bulb-border mb-8 text-center">
          <h1 className="font-display neon-text text-5xl leading-tight sm:text-6xl">
            FOOD
            <br />
            FIGHT
          </h1>
          <p className="mt-3 font-display text-xs tracking-[0.3em] text-cyan/80 sm:text-sm">
            PICK · RANK · WIN LUNCH
          </p>
        </div>

        <form
          onSubmit={submit}
          className="felt-panel neon-border rounded-3xl p-6 sm:p-8"
        >
          <label className="mb-1 block text-sm font-semibold text-gold/90">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="hungry_hippo"
            required
            className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-foreground placeholder-white/30 outline-none focus:border-gold/60"
          />

          <label className="mb-1 block text-sm font-semibold text-gold/90">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="mb-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-foreground placeholder-white/30 outline-none focus:border-gold/60"
          />
          <p className="mb-5 text-xs text-white/40">
            New here? Just pick a username &amp; password — your seat gets created automatically.
          </p>

          {error && (
            <motion.p
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.96 }}
            className="chip-btn w-full py-3.5 text-lg font-display"
          >
            {loading ? "SPINNING…" : "LET'S GOOO 🎰"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
