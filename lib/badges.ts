import type { PublicWinner } from "./types";

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  who: string;
  detail: string;
}

const KINGMAKER_WINS = 3;

// Everything here is computed from the hall of fame, so there's nothing to
// store. `winners` can be in any order. `dodgyNames` is the lowercased set of
// Rodeo Goat places.
export function computeBadges(winners: PublicWinner[], dodgyNames: Set<string>): Badge[] {
  const byDate = [...winners].sort((a, b) => b.decidedAt - a.decidedAt);
  const badges: Badge[] = [];

  // runs of the same picker / the same place, newest first
  function currentRun(keyFn: (w: PublicWinner) => string) {
    if (byDate.length === 0) return { key: "", length: 0 };
    const head = keyFn(byDate[0]);
    let length = 0;
    for (const w of byDate) {
      if (keyFn(w) !== head) break;
      length++;
    }
    return { key: head, length };
  }

  const pickerRun = currentRun((w) => w.submittedBy);
  if (pickerRun.length >= 2) {
    badges.push({
      id: "on-a-roll",
      emoji: "🔥",
      title: "on a roll",
      who: pickerRun.key,
      detail: `${pickerRun.length} wins in a row`,
    });
  }

  const placeRun = currentRun((w) => w.name.trim().toLowerCase());
  if (placeRun.length >= 2) {
    badges.push({
      id: "back-to-back",
      emoji: "🔁",
      title: "back to back",
      who: byDate[0].name,
      detail: `${placeRun.length} wins in a row`,
    });
  }

  const winsByPicker = new Map<string, number>();
  for (const w of winners) winsByPicker.set(w.submittedBy, (winsByPicker.get(w.submittedBy) ?? 0) + 1);
  for (const [who, wins] of [...winsByPicker].sort((a, b) => b[1] - a[1])) {
    if (wins >= KINGMAKER_WINS) {
      badges.push({ id: `kingmaker-${who}`, emoji: "👑", title: "kingmaker", who, detail: `${wins} winning picks` });
    }
  }

  const tamers = new Map<string, number>();
  for (const w of winners) {
    if (dodgyNames.has(w.name.trim().toLowerCase())) {
      tamers.set(w.submittedBy, (tamers.get(w.submittedBy) ?? 0) + 1);
    }
  }
  for (const [who, wins] of tamers) {
    badges.push({
      id: `goat-${who}`,
      emoji: "🐐",
      title: "goat whisperer",
      who,
      detail: wins === 1 ? "got the rodeo goat to win" : `got the rodeo goat to win ${wins} times`,
    });
  }

  return badges;
}
