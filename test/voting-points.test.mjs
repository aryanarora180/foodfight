import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { wipeState, bootstrapAdmin, createActivatedUser, addToHistory } from "./helpers/game.mjs";

beforeEach(wipeState);

// Points scoring, per the README: for N restaurants, rank i (0-indexed,
// 0 = favorite) earns N - i points.
//
// Three restaurants, three ballots:
//   A: [R1, R2, R3]  ->  R1 +3, R2 +2, R3 +1
//   B: [R2, R1, R3]  ->  R2 +3, R1 +2, R3 +1
//   C: [R1, R3, R2]  ->  R1 +3, R3 +2, R2 +1
//
// Totals worked out by hand: R1 = 3+2+3 = 8 (first-place votes: A, C = 2)
//                            R2 = 2+3+1 = 6 (first-place votes: B = 1)
//                            R3 = 1+1+2 = 4 (first-place votes: 0)
test("points voting totals match hand-computed scores, winner and ordering", async () => {
  const admin = await bootstrapAdmin("points-admin-1");
  const b = await createActivatedUser(admin.client, "b-voter-1");
  const c = await createActivatedUser(admin.client, "c-voter-1");

  const idR1 = await addToHistory(admin.client, "R1 Restaurant");
  const idR2 = await addToHistory(admin.client, "R2 Restaurant");
  const idR3 = await addToHistory(admin.client, "R3 Restaurant");
  await admin.client.post("/api/submit", { historyId: idR1 });
  await b.client.post("/api/submit", { historyId: idR2 });
  await c.client.post("/api/submit", { historyId: idR3 });

  await admin.client.post("/api/admin/start-voting", { votingType: "points" });
  const state = await admin.client.get("/api/state");
  const R1 = state.data.state.restaurants.find((r) => r.name === "R1 Restaurant").id;
  const R2 = state.data.state.restaurants.find((r) => r.name === "R2 Restaurant").id;
  const R3 = state.data.state.restaurants.find((r) => r.name === "R3 Restaurant").id;

  await admin.client.post("/api/vote", { order: [R1, R2, R3] });
  await b.client.post("/api/vote", { order: [R2, R1, R3] });
  const last = await c.client.post("/api/vote", { order: [R1, R3, R2] });

  assert.equal(last.data.state.phase, "results");
  const byId = Object.fromEntries(last.data.state.scores.map((s) => [s.restaurant.id, s]));
  assert.equal(byId[R1].points, 8);
  assert.equal(byId[R1].firstPlaceVotes, 2);
  assert.equal(byId[R2].points, 6);
  assert.equal(byId[R2].firstPlaceVotes, 1);
  assert.equal(byId[R3].points, 4);
  assert.equal(byId[R3].firstPlaceVotes, 0);

  assert.equal(last.data.state.tie, false);
  assert.equal(last.data.state.winner.restaurant.id, R1);
  assert.equal(last.data.state.winner.points, 8);

  const orderedNames = last.data.state.scores.map((s) => s.restaurant.name);
  assert.deepEqual(orderedNames, ["R1 Restaurant", "R2 Restaurant", "R3 Restaurant"]);

  const win = last.data.state.winnerHistory[0];
  assert.equal(win.name, "R1 Restaurant");
  assert.equal(win.votingType, "points");
  assert.equal(win.points, 8);
  assert.equal(win.firstPlaceVotes, 2);
  assert.equal(win.participantCount, 3);
});

// Two restaurants, two ballots, exactly reversed: a dead-even points tie.
//   A: [R1, R2] -> R1 +2, R2 +1
//   B: [R2, R1] -> R2 +2, R1 +1
// Totals: R1 = 3, R2 = 3 -> tie, and ties are never logged to history.
test("a dead-even points tie is reported as a tie and is not logged to history", async () => {
  const admin = await bootstrapAdmin("points-admin-2");
  const b = await createActivatedUser(admin.client, "b-voter-2");

  const idR1 = await addToHistory(admin.client, "Tie Alpha");
  const idR2 = await addToHistory(admin.client, "Tie Beta");
  await admin.client.post("/api/submit", { historyId: idR1 });
  await b.client.post("/api/submit", { historyId: idR2 });

  await admin.client.post("/api/admin/start-voting", { votingType: "points" });
  const state = await admin.client.get("/api/state");
  const R1 = state.data.state.restaurants.find((r) => r.name === "Tie Alpha").id;
  const R2 = state.data.state.restaurants.find((r) => r.name === "Tie Beta").id;

  await admin.client.post("/api/vote", { order: [R1, R2] });
  const last = await b.client.post("/api/vote", { order: [R2, R1] });

  assert.equal(last.data.state.phase, "results");
  assert.equal(last.data.state.tie, true);
  assert.equal(last.data.state.winner, null);
  assert.equal(last.data.state.winnerHistory.length, 0, "a tie should not be logged as a win");
});
