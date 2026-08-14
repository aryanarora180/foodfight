"use client";

import { useEffect } from "react";
import useSWR from "swr";
import type { PublicState } from "./types";

export interface SessionUser {
  username: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// everyone refetches on the same wall-clock tick (e.g. every 2.5s on the
// dot, per system time) instead of N seconds after each tab happened to
// load — so the whole team's screens update in lockstep.
const POLL_INTERVAL_MS = 2500;

function useClockAlignedPoll(enabled: boolean, onTick: () => void) {
  useEffect(() => {
    if (!enabled) return;
    let timeoutId: ReturnType<typeof setTimeout>;
    function scheduleNext() {
      const delay = POLL_INTERVAL_MS - (Date.now() % POLL_INTERVAL_MS);
      timeoutId = setTimeout(() => {
        onTick();
        scheduleNext();
      }, delay);
    }
    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, [enabled, onTick]);
}

export function useSession() {
  const { data, mutate, isLoading } = useSWR<{ user: SessionUser | null }>(
    "/api/auth/me",
    fetcher
  );
  // polled so a kicked user's screen notices their session died and drops
  // them back to the login screen without needing a manual refresh.
  useClockAlignedPoll(Boolean(data?.user), () => mutate());
  return { user: data?.user ?? null, isLoading, mutate };
}

export function useGameState(enabled: boolean) {
  const { data, mutate, error } = useSWR<{ state: PublicState } | { error: string }>(
    enabled ? "/api/state" : null,
    fetcher,
    { revalidateOnFocus: true }
  );
  useClockAlignedPoll(enabled, () => mutate());
  const state = data && "state" in data ? data.state : null;
  return { state, mutate, error };
}
