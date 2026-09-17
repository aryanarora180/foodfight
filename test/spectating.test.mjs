import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { wipeState, bootstrapAdmin, createActivatedUser, addToHistory } from "./helpers/game.mjs";

beforeEach(wipeState);

test("the not-coming flag carries over across a round reset until toggled back", async () => {
  const admin = await bootstrapAdmin("spec-admin-1");
  const spectator = await createActivatedUser(admin.client, "spec-1");

  await spectator.client.post("/api/not-coming", { value: true });

  const idA = await addToHistory(admin.client, "Spec Round A");
  await admin.client.post("/api/submit", { historyId: idA });

  const reset = await admin.client.post("/api/admin/reset", {});
  const stillOut = reset.data.state.users.find((u) => u.username === "spec-1");
  assert.equal(stillOut.notComing, true, "the flag should survive a round reset");

  const backIn = await spectator.client.post("/api/not-coming", { value: false });
  const flippedBack = backIn.data.state.users.find((u) => u.username === "spec-1");
  assert.equal(flippedBack.notComing, false);
});

test("a spectator sees submitted picks and results like anyone else, with no early access to sealed ballots", async () => {
  const admin = await bootstrapAdmin("spec-admin-2");
  const voter = await createActivatedUser(admin.client, "spec-voter-2");
  const spectator = await createActivatedUser(admin.client, "spec-2");
  await spectator.client.post("/api/not-coming", { value: true });

  const idA = await addToHistory(admin.client, "Visible To All A");
  const idB = await addToHistory(admin.client, "Visible To All B");
  await admin.client.post("/api/submit", { historyId: idA });
  await voter.client.post("/api/submit", { historyId: idB });

  const spectatorView = await spectator.client.get("/api/state");
  assert.equal(spectatorView.status, 200);
  assert.equal(spectatorView.data.state.restaurants.length, 2, "spectators see submitted picks");

  await admin.client.post("/api/admin/start-voting", { votingType: "simple" });
  const midVoting = await spectator.client.get("/api/state");
  assert.equal(
    midVoting.data.state.votes.length,
    0,
    "spectators get no special early view into sealed ballots"
  );

  const state = await admin.client.get("/api/state");
  const r1 = state.data.state.restaurants[0].id;
  await admin.client.post("/api/vote", { order: [r1] });
  const finalResult = await voter.client.post("/api/vote", { order: [r1] });
  assert.equal(finalResult.data.state.phase, "results");

  const spectatorAfterResults = await spectator.client.get("/api/state");
  assert.equal(spectatorAfterResults.data.state.phase, "results");
  assert.ok(spectatorAfterResults.data.state.winner, "spectators see the results once revealed");
});

test("admins can mark or unmark anyone's not-coming flag from the People list", async () => {
  const admin = await bootstrapAdmin("spec-admin-3");
  await createActivatedUser(admin.client, "spec-3");

  const mark = await admin.client.post("/api/admin/set-not-coming", {
    username: "spec-3",
    value: true,
  });
  assert.equal(mark.status, 200);
  assert.equal(mark.data.state.users.find((u) => u.username === "spec-3").notComing, true);

  const unmark = await admin.client.post("/api/admin/set-not-coming", {
    username: "spec-3",
    value: false,
  });
  assert.equal(unmark.data.state.users.find((u) => u.username === "spec-3").notComing, false);
});
