import type { GameState } from "./types";

export function isDesignatedAdmin(username: string, state: GameState): boolean {
  const list = (process.env.ADMIN_USERNAMES || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (list.includes(username.toLowerCase())) return true;

  // If no admin list is configured, the very first person to ever sign up
  // becomes the admin so the app is usable out of the box.
  if (list.length === 0 && Object.keys(state.users).length === 0) return true;

  return false;
}
