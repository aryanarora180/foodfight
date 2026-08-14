import fs from "node:fs";
import path from "node:path";
import Redis from "ioredis";
import type { GameState } from "./types";

const STATE_KEY = "foodfight:state";

function emptyState(): GameState {
  return {
    phase: "submission",
    votingType: "points",
    restaurants: [],
    votes: {},
    users: {},
    passes: {},
    restaurantHistory: {},
    updatedAt: Date.now(),
  };
}

const hasRedis = Boolean(process.env.REDIS_URL);

const redis = hasRedis ? new Redis(process.env.REDIS_URL!) : null;

if (!hasRedis && process.env.NODE_ENV === "production") {
  console.warn(
    "[foodfight] No REDIS_URL env var found in production. Falling back to local file storage, which will NOT persist on Vercel. Connect a Redis database in Project Settings > Storage."
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
    const raw = await redis.get(STATE_KEY);
    return raw ? { ...emptyState(), ...(JSON.parse(raw) as GameState) } : emptyState();
  }
  return readFileState();
}

export async function setState(state: GameState): Promise<void> {
  state.updatedAt = Date.now();
  if (redis) {
    await redis.set(STATE_KEY, JSON.stringify(state));
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
