import { getSession } from "./session";
import { getState } from "./store";
import type { GameState, UserRecord } from "./types";

/**
 * Reads the session and cross-checks it against the current user roster.
 * If the session points at a username that's been removed (kicked), the
 * session is destroyed so the cookie stops working immediately instead of
 * staying "logged in" until it naturally expires.
 */
export async function getActiveSession(): Promise<{
  session: Awaited<ReturnType<typeof getSession>>;
  state: GameState;
  record: UserRecord | null;
}> {
  const session = await getSession();
  const state = await getState();
  if (!session.username) {
    return { session, state, record: null };
  }
  const record = state.users[session.username.toLowerCase()] ?? null;
  if (!record) {
    await session.destroy();
  }
  return { session, state, record };
}
