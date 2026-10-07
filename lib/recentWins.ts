import type { PublicWinner } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
// Past this, "won 5 months ago" stops being a reason to think twice.
const RECENT_DAYS = 90;

const key = (name: string) => name.trim().toLowerCase();

// Most recent win per restaurant name (names are how a place is identified
// across rounds, since round ids don't survive a reset).
export function lastWonByName(winners: Pick<PublicWinner, "name" | "decidedAt">[]) {
  const map = new Map<string, number>();
  for (const w of winners) {
    const k = key(w.name);
    if ((map.get(k) ?? 0) < w.decidedAt) map.set(k, w.decidedAt);
  }
  return map;
}

export function wonText(
  lastWon: Map<string, number> | undefined,
  name: string,
  now = Date.now()
): string | null {
  const at = lastWon?.get(key(name));
  if (at === undefined) return null;
  const days = Math.floor((now - at) / DAY_MS);
  if (days > RECENT_DAYS) return null;
  if (days < 1) return "won today";
  if (days === 1) return "won yesterday";
  if (days < 14) return `won ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 9) return `won ${weeks} weeks ago`;
  return `won ${Math.floor(days / 30)} months ago`;
}
