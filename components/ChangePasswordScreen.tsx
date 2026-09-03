"use client";

import { useState } from "react";
import { motion } from "framer-motion";

export function ChangePasswordScreen({
  username,
  onChanged,
  onLogout,
}: {
  username: string;
  onChanged: () => void;
  onLogout: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("new passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "something went wrong");
        return;
      }
      onChanged();
    } catch {
      setError("network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bulb-border felt-panel neon-border mb-8 rounded-3xl px-6 py-8 text-center">
          <h1 className="font-display neon-text text-3xl leading-tight sm:text-4xl">
            NEW LOCK, {username.toUpperCase()}
          </h1>
          <p className="mt-3 font-display text-xs tracking-[0.3em] text-sky/80 sm:text-sm">
            SET A REAL PASSWORD
          </p>
        </div>

        <form onSubmit={submit} className="felt-panel neon-border rounded-3xl p-6 sm:p-8">
          <p className="mb-5 text-sm text-white/50">
            that temp password only works once — pick a real one before you go any further.
          </p>

          <label className="mb-1 block text-sm font-semibold text-gold/90">
            Current (temp) password
          </label>
          <input
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            type="password"
            required
            autoFocus
            className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-gold/60"
          />

          <label className="mb-1 block text-sm font-semibold text-gold/90">New password</label>
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            required
            minLength={6}
            className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-gold/60"
          />

          <label className="mb-1 block text-sm font-semibold text-gold/90">
            Confirm new password
          </label>
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            required
            minLength={6}
            className="mb-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-gold/60"
          />
          <p className="mb-5 text-xs text-white/40">6+ characters.</p>

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
            {loading ? "LOCKING IN…" : "SET MY PASSWORD 🔒"}
          </motion.button>
          <button
            type="button"
            onClick={onLogout}
            className="chip-btn-ghost mt-3 w-full rounded-full py-2.5 text-sm"
          >
            never mind, log out
          </button>
        </form>
      </motion.div>
    </div>
  );
}
