import fs from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import type { GameState } from "./types";

const STATE_KEY = "foodfight:state";

function emptyState(): GameState {
  return {
    phase: "submission",
    restaurants: [],
    votes: {},
    users: {},
    updatedAt: Date.now(),
  };
}

const hasRedis = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = hasRedis ? Redis.fromEnv() : null;

if (!hasRedis && process.env.NODE_ENV === "production") {
  console.warn(
    "[foodfight] No Upstash Redis env vars found in production. Falling back to local file storage, which will NOT persist on Vercel. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
  );
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "state.json");

function readFileState(): GameState {
  try {
    if (!fs.existsSync(DATA_FILE)) return emptyState();
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as GameState;
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

function writeFileState(state: GameState) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

export async function getState(): Promise<GameState> {
  if (redis) {
    const state = await redis.get<GameState>(STATE_KEY);
    return state ? { ...emptyState(), ...state } : emptyState();
  }
  return readFileState();
}

export async function setState(state: GameState): Promise<void> {
  state.updatedAt = Date.now();
  if (redis) {
    await redis.set(STATE_KEY, state);
    return;
  }
  writeFileState(state);
}

/**
 * Read-modify-write helper. Not perfectly atomic under heavy concurrent
 * writes, but fine for a small team's lunch-voting scale.
 */
export async function updateState<T>(
  mutator: (state: GameState) => T
): Promise<{ state: GameState; result: T }> {
  const state = await getState();
  const result = mutator(state);
  await setState(state);
  return { state, result };
}
