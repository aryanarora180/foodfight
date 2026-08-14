"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function CreateUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (result: { username: string; tempPassword: string }) => void;
}) {
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function close() {
    setUsername("");
    setIsAdmin(false);
    setError(null);
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, isAdmin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "something went wrong");
        return;
      }
      onCreated({ username: data.username, tempPassword: data.tempPassword });
      setUsername("");
      setIsAdmin(false);
    } catch {
      setError("network error — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="felt-panel neon-border w-full max-w-sm rounded-3xl p-6"
          >
            <form onSubmit={submit}>
              <p className="font-display mb-1 text-lg text-gold">create an account</p>
              <p className="mb-4 text-xs text-white/40">
                generates a temp password they&apos;ll be forced to change on their first login.
              </p>
              <label className="mb-1 block text-sm font-semibold text-gold/90">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="hungry_hippo"
                required
                autoFocus
                className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-gold/60"
              />
              <label className="mb-4 flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                />
                make them an admin too
              </label>
              {error && (
                <p className="mb-4 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={close}
                  className="chip-btn-ghost rounded-full px-5 py-2 text-sm"
                >
                  cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="chip-btn rounded-full px-5 py-2 text-sm disabled:opacity-40"
                >
                  {loading ? "creating…" : "create"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
