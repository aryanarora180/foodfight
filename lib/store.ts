import fs from "node:fs";
import path from "node:path";
import Redis from "ioredis";
import { nanoid } from "nanoid";
import type { GameState, HistoryEntry } from "./types";

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
    winnerHistory: [],
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

// overridable so the behavior-test suite can point at its own scratch file
// without touching a developer's real local `.data/state.json` — the
// directory segment stays a literal ".data" (only the filename varies) so
// bundlers can statically scope filesystem tracing to that folder instead
// of tracing the whole project
const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = process.env.FOODFIGHT_DATA_FILE
  ? path.join(DATA_DIR, path.basename(process.env.FOODFIGHT_DATA_FILE))
  : path.join(DATA_DIR, "state.json");

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

// pre-refactor restaurantHistory was keyed by username with no `id` field on
// each entry; backfill ids and re-key by id so old data keeps working with
// code that now looks entries up by id. Idempotent — a no-op once migrated.
function migrateHistory(state: GameState): boolean {
  let changed = false;
  const migrated: Record<string, HistoryEntry> = {};
  for (const [key, entry] of Object.entries(state.restaurantHistory ?? {})) {
    const id = entry.id ?? nanoid(8);
    if (id !== key || !entry.id) changed = true;
    migrated[id] = { ...entry, id };
  }
  if (changed) state.restaurantHistory = migrated;
  return changed;
}

export async function getState(): Promise<GameState> {
  let state: GameState;
  if (redis) {
    const raw = await redis.get(STATE_KEY);
    state = raw ? { ...emptyState(), ...(JSON.parse(raw) as GameState) } : emptyState();
  } else {
    state = readFileState();
  }
  if (migrateHistory(state)) {
    await setState(state);
  }
  return state;
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
