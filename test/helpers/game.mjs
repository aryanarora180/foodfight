import { rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "./client.mjs";
import { DATA_FILE_REL } from "./config.mjs";

const DATA_FILE_ABS = path.join(process.cwd(), DATA_FILE_REL);

// Full wipe of the shared game state file. Every test file should call
// this once, before doing anything else, so each file starts from a truly
// empty app (no users, no restaurants, no history) regardless of what an
// earlier test file left behind. The server itself reads this file fresh
// on every request (no in-memory cache in file-storage mode), so deleting
// it between requests is safe as long as test files run one at a time.
export async function wipeState() {
  await rm(DATA_FILE_ABS, { force: true });
}

export async function readRawState() {
  const raw = await readFile(DATA_FILE_ABS, "utf-8");
  return JSON.parse(raw);
}

export async function writeRawState(state) {
  await writeFile(DATA_FILE_ABS, JSON.stringify(state, null, 2));
}

// Logs in a brand-new username against an empty (or admin-only) app. On a
// state with zero users and no ADMIN_USERNAMES configured, the very first
// account to log in becomes admin automatically — this is that bootstrap.
export async function bootstrapAdmin(username = "admin", password = "adminpass123") {
  const client = createClient();
  const res = await client.post("/api/auth/login", { username, password });
  return { client, res, username, password };
}

// Admin creates an account, then that account logs in with its one-time
// temp password and immediately sets a real one — mirrors the real
// first-login flow so every other test can treat the returned client as a
// fully activated user, exactly like a teammate who's already through
// onboarding.
export async function createActivatedUser(adminClient, username, { isAdmin = false } = {}) {
  const createRes = await adminClient.post("/api/admin/create-user", { username, isAdmin });
  if (!createRes.ok) {
    throw new Error(`failed to create user ${username}: ${JSON.stringify(createRes.data)}`);
  }
  const tempPassword = createRes.data.tempPassword;
  const client = createClient();
  const loginRes = await client.post("/api/auth/login", { username, password: tempPassword });
  if (!loginRes.ok) {
    throw new Error(`failed to log in freshly-created user ${username}`);
  }
  const password = `${username}Real123!`;
  const changeRes = await client.post("/api/auth/change-password", {
    currentPassword: tempPassword,
    newPassword: password,
  });
  if (!changeRes.ok) {
    throw new Error(`failed to activate user ${username}: ${JSON.stringify(changeRes.data)}`);
  }
  return { client, username, password, tempPassword };
}

// Adds a restaurant to the shared list and returns its history id, the
// thing a caller needs to submit a pick for the current round.
export async function addToHistory(client, name, url = "https://example.com/menu") {
  const res = await client.post("/api/add-suggestion", { name, url });
  if (!res.ok) {
    throw new Error(`failed to add "${name}" to history: ${JSON.stringify(res.data)}`);
  }
  const entry = res.data.state.history.find((h) => h.name === name);
  return entry.id;
}

// Finds the round-level restaurant id a user's current pick resolved to,
// by matching on submittedBy — useful right after /api/submit, whose own
// response doesn't hand back the new restaurant id directly.
export function findRestaurantIdFor(state, username) {
  const r = state.restaurants.find((r) => r.submittedBy === username);
  return r ? r.id : null;
}
