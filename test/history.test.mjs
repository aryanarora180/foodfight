import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { wipeState, bootstrapAdmin, createActivatedUser, addToHistory } from "./helpers/game.mjs";

beforeEach(wipeState);

async function playSimpleRoundToWin(admin, voter, restaurantName) {
  const idWin = await addToHistory(admin.client, restaurantName);
  const idOther = await addToHistory(admin.client, `${restaurantName} Loser`);
  await admin.client.post("/api/submit", { historyId: idWin });
  await voter.client.post("/api/submit", { historyId: idOther });
  await admin.client.post("/api/admin/start-voting", { votingType: "simple" });
  const state = await admin.client.get("/api/state");
  const winId = state.data.state.restaurants.find((r) => r.name === restaurantName).id;
  await admin.client.post("/api/vote", { order: [winId] });
  return voter.client.post("/api/vote", { order: [winId] });
}

test("a resolved round is logged with the full expected shape, and survives resetting the round", async () => {
  const admin = await bootstrapAdmin("hist-admin-1");
  const voter = await createActivatedUser(admin.client, "hist-voter-1");

  const startedAt = Date.now();
  const result = await playSimpleRoundToWin(admin, voter, "Hall Of Fame Diner");
  const finishedAt = Date.now();

  const win = result.data.state.winnerHistory.find((w) => w.name === "Hall Of Fame Diner");
  assert.ok(win, "the winning round should be logged");
  assert.equal(typeof win.id, "string");
  assert.ok(win.id.length > 0);
  assert.equal(win.submittedBy, "hist-admin-1");
  assert.equal(win.votingType, "simple");
  assert.equal(win.participantCount, 2);
  assert.ok(win.decidedAt >= startedAt && win.decidedAt <= finishedAt);

  const reset = await admin.client.post("/api/admin/reset", {});
  const stillThere = reset.data.state.winnerHistory.find((w) => w.name === "Hall Of Fame Diner");
  assert.ok(stillThere, "resetting the round must not touch the hall of fame");
});

test("admins can remove a hall-of-fame entry; non-admins and unknown ids are rejected", async () => {
  const admin = await bootstrapAdmin("hist-admin-2");
  const voter = await createActivatedUser(admin.client, "hist-voter-2");
  const result = await playSimpleRoundToWin(admin, voter, "Removable Winner");
  const winId = result.data.state.winnerHistory.find((w) => w.name === "Removable Winner").id;

  const byNonAdmin = await voter.client.post("/api/admin/delete-winner", { id: winId });
  assert.equal(byNonAdmin.status, 403);

  const unknown = await admin.client.post("/api/admin/delete-winner", { id: "not-a-real-id" });
  assert.equal(unknown.status, 400);

  const del = await admin.client.post("/api/admin/delete-winner", { id: winId });
  assert.equal(del.status, 200);
  assert.ok(!del.data.state.winnerHistory.some((w) => w.id === winId));
});

test("winnerHistory comes back newest-first", async () => {
  const admin = await bootstrapAdmin("hist-admin-3");
  const voter = await createActivatedUser(admin.client, "hist-voter-3");

  await playSimpleRoundToWin(admin, voter, "First Winner");
  await admin.client.post("/api/admin/reset", {});
  const secondResult = await playSimpleRoundToWin(admin, voter, "Second Winner");

  const names = secondResult.data.state.winnerHistory.map((w) => w.name);
  assert.deepEqual(names, ["Second Winner", "First Winner"]);
});
