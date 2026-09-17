"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function AddRestaurantModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function close() {
    setName("");
    setUrl("");
    setError(null);
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/add-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "something went wrong");
        return;
      }
      setName("");
      setUrl("");
      onAdded();
    } catch {
      setError("network error. try again.");
    } finally {
      setSaving(false);
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
              <p className="font-display mb-1 text-lg text-gold">add a restaurant</p>
              <p className="mb-4 text-xs text-white/40">
                goes straight into the shared list. anyone can pick it for a future round.
              </p>
              <label className="mb-1 block text-sm font-semibold text-gold/90">
                Restaurant name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Big Jon's Pizza"
                required
                autoFocus
                className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-gold/60"
              />
              <label className="mb-1 block text-sm font-semibold text-gold/90">Menu URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                required
                type="url"
                className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-gold/60"
              />
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
                  disabled={saving}
                  className="chip-btn rounded-full px-5 py-2 text-sm disabled:opacity-40"
                >
                  {saving ? "adding…" : "add"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
