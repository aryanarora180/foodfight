// Orchestrates the whole behavior-test run:
//   1. boots a `next dev` server on its own port, pointed at its own
//      scratch data file (never touching a developer's real .data/state.json
//      or a real Redis database),
//   2. waits for it to actually answer requests,
//   3. runs every test/*.test.mjs file against it with node's built-in test
//      runner, one file at a time (the app is a single shared game state,
//      not multi-tenant, so test files can't safely run concurrently),
//   4. tears the server down and exits with the tests' own exit code.
import { spawn } from "node:child_process";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { BASE_URL, PORT, DATA_FILE_REL, SESSION_SECRET } from "./helpers/config.mjs";

const ROOT = process.cwd();
const READY_TIMEOUT_MS = 90_000;

function log(msg) {
  console.log(`[test/run] ${msg}`);
}

async function waitForServer() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`);
      if (res.status === 200) return;
    } catch {
      // server not up yet, keep polling
    }
    await delay(300);
  }
  throw new Error(`server did not become ready within ${READY_TIMEOUT_MS}ms`);
}

function killTree(child) {
  if (!child || child.killed || child.exitCode !== null) return;
  try {
    child.kill("SIGTERM");
  } catch {
    // already gone
  }
}

async function main() {
  await rm(path.join(ROOT, DATA_FILE_REL), { force: true });

  const serverEnv = {
    ...process.env,
    PORT: String(PORT),
    FOODFIGHT_DATA_FILE: DATA_FILE_REL,
    SESSION_SECRET,
    // force file-mode storage and the bootstrap-first-admin flow
    // regardless of whatever the developer's own shell/.env.local has set
    REDIS_URL: "",
    ADMIN_USERNAMES: "",
    NODE_ENV: "development",
  };

  log(`starting isolated dev server on ${BASE_URL} (data file: ${DATA_FILE_REL})`);
  const nextBin = path.join(ROOT, "node_modules", ".bin", "next");
  const server = spawn(nextBin, ["dev", "-p", String(PORT)], {
    cwd: ROOT,
    env: serverEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverOutput = "";
  server.stdout.on("data", (d) => (serverOutput += d.toString()));
  server.stderr.on("data", (d) => (serverOutput += d.toString()));

  let serverExitedEarly = false;
  server.once("exit", (code) => {
    if (!ready) {
      serverExitedEarly = true;
      log(`server exited early (code ${code}). output:\n${serverOutput}`);
    }
  });

  let ready = false;
  try {
    await waitForServer();
    ready = true;
  } catch (err) {
    killTree(server);
    console.error(serverOutput);
    console.error(err.message);
    process.exit(1);
  }
  if (serverExitedEarly) process.exit(1);
  log("server ready. running tests…");

  // Explicit file list, not directory-based discovery: node:test's default
  // discovery treats *every* file directly under a directory named "test"
  // as a candidate test file (not just ones matching *.test.mjs) — which
  // previously swept up this very script (test/run.mjs) as a "test",
  // causing it to recursively re-invoke itself mid-suite and race its own
  // rm(dataFile) against in-flight tests. Enumerating only test/*.test.mjs
  // avoids that entirely.
  const testDir = path.join(ROOT, "test");
  const entries = await readdir(testDir);
  const testFiles = entries
    .filter((name) => name.endsWith(".test.mjs"))
    .sort()
    .map((name) => path.join(testDir, name));

  const testRunner = spawn(
    process.execPath,
    ["--test", "--test-concurrency=1", ...testFiles],
    {
      cwd: ROOT,
      env: { ...process.env, BASE_URL },
      stdio: "inherit",
      shell: false,
    }
  );

  const exitCode = await new Promise((resolve) => {
    testRunner.once("exit", (code) => resolve(code ?? 1));
  });

  killTree(server);
  await delay(200);
  process.exit(exitCode);
}

process.on("SIGINT", () => process.exit(130));

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
