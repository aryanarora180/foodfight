// The team has had Rodeo Goat enough times. Matches loose spellings like
// "rodeo goat", "RodeoGoat", or "Rodeo Goat (Dallas)".
export function isRodeoGoat(name: string): boolean {
  return name.toLowerCase().replace(/[^a-z]/g, "").includes("rodeogoat");
}

// Whether a restaurant gets the "pls not again" treatment: the popup on
// pick, running from the cursor, and the top-3 voting nag. Admins can turn
// it on or off per restaurant; Rodeo Goat is on until an admin says otherwise.
export function isDodgy(entry: { name: string; dodgy?: boolean }): boolean {
  return entry.dodgy ?? isRodeoGoat(entry.name);
}

// Round restaurants don't carry the flag, so look it up on the list entry
// with the same name.
export function dodgyNameSet(history: { name: string; dodgy?: boolean }[]): Set<string> {
  return new Set(history.filter(isDodgy).map((h) => h.name.trim().toLowerCase()));
}
