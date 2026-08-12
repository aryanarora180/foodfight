"use client";

import useSWR from "swr";
import type { PublicState } from "./types";

export interface SessionUser {
  username: string;
  isAdmin: boolean;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSession() {
  const { data, mutate, isLoading } = useSWR<{ user: SessionUser | null }>(
    "/api/auth/me",
    fetcher
  );
  return { user: data?.user ?? null, isLoading, mutate };
}

export function useGameState(enabled: boolean) {
  const { data, mutate, error } = useSWR<{ state: PublicState } | { error: string }>(
    enabled ? "/api/state" : null,
    fetcher,
    { refreshInterval: 2500, revalidateOnFocus: true }
  );
  const state = data && "state" in data ? data.state : null;
  return { state, mutate, error };
}
