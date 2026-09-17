import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { wipeState, bootstrapAdmin, createActivatedUser, addToHistory } from "./helpers/game.mjs";

beforeEach(wipeState);

// Ranked choice (instant runoff), per the README: rank everyone; if nobody
// has a majority of remaining ballots, the lowest-ranked pick is eliminated
// and its votes shift to whoever's next on those ballots, repeating until
// someone clears a majority (or a full tie among everyone left is called).

test("ranked choice: an outright first-round majority needs no elimination round", async () => {
  const admin = await bootstrapAdmin("ranked-admin-1");
  const b = await createActivatedUser(admin.client, "b-voter-r1");
  const c = await createActivatedUser(admin.client, "c-voter-r1");

  const idA = await addToHistory(admin.client, "Majority Winner");
  const idB = await addToHistory(admin.client, "Runner Up");
  await admin.client.post("/api/submit", { historyId: idA });
  await b.client.post("/api/submit", { historyId: idB });
  // c sits this round out entirely so only admin and b need to vote
  await c.client.post("/api/not-coming", { value: true });

  await admin.client.post("/api/admin/start-voting", { votingType: "ranked" });
  const state = await admin.client.get("/api/state");
  const winnerId = state.data.state.restaurants.find((r) => r.name === "Majority Winner").id;
  const otherId = state.data.state.restaurants.find((r) => r.name === "Runner Up").id;

  // all active (non-spectating) ballots rank the same restaurant first
  await admin.client.post("/api/vote", { order: [winnerId, otherId] });
  const last = await b.client.post("/api/vote", { order: [winnerId, otherId] });

  assert.equal(last.data.state.phase, "results");
  assert.equal(last.data.state.tie, false);
  assert.equal(last.data.state.winner.restaurant.id, winnerId);
  assert.equal(last.data.state.rankedRounds.length, 1, "an outright majority resolves in one round");
  assert.equal(last.data.state.winner.points, 2, "final-round vote count for the winner");
  assert.equal(last.data.state.winner.firstPlaceVotes, 2);
});

test("ranked choice: rankedRounds is only exposed once results are in", async () => {
  const admin = await bootstrapAdmin("ranked-admin-2");
  const b = await createActivatedUser(admin.client, "b-voter-r2");
  const idA = await addToHistory(admin.client, "Pending A");
  const idB = await addToHistory(admin.client, "Pending B");
  await admin.client.post("/api/submit", { historyId: idA });
  await b.client.post("/api/submit", { historyId: idB });
  await admin.client.post("/api/admin/start-voting", { votingType: "ranked" });

  const midState = await admin.client.get("/api/state");
  assert.equal(midState.data.state.rankedRounds, null);
});

// Four candidates, five voters, engineered so round 1 has no majority and a
// three-way tie for last place, eliminating three candidates at once and
// leaving a single winner going into round 2:
//
//   V1: Alpha, Bravo, Charlie, Delta
//   V2: Alpha, Charlie, Bravo, Delta
//   V3: Bravo, Alpha, Delta, Charlie
//   V4: Charlie, Delta, Alpha, Bravo
//   V5: Delta, Charlie, Alpha, Bravo
//
// Round 1 first-choice counts: Alpha=2 (V1,V2), Bravo=1 (V3), Charlie=1 (V4),
// Delta=1 (V5). 5 ballots, majority threshold is 2.5, so Alpha's 2 doesn't
// clear it. Bravo/Charlie/Delta are tied for last (1 each) and all three get
// eliminated together, leaving only Alpha — an immediate round-2 winner with
// all 5 ballots now counted for Alpha (since every ballot eventually ranks
// Alpha above the three eliminated names).
test("ranked choice: a tied last-place elimination round, then a round-2 winner", async () => {
  const admin = await bootstrapAdmin("ranked-admin-3");
  const v2 = await createActivatedUser(admin.client, "v2-r3");
  const v3 = await createActivatedUser(admin.client, "v3-r3");
  const v4 = await createActivatedUser(admin.client, "v4-r3");
  const v5 = await createActivatedUser(admin.client, "v5-r3");

  const idAlpha = await addToHistory(admin.client, "Alpha Diner");
  const idBravo = await addToHistory(admin.client, "Bravo Grill");
  const idCharlie = await addToHistory(admin.client, "Charlie Cafe");
  const idDelta = await addToHistory(admin.client, "Delta Kitchen");

  await admin.client.post("/api/submit", { historyId: idAlpha });
  await v2.client.post("/api/submit", { historyId: idBravo });
  await v3.client.post("/api/submit", { historyId: idCharlie });
  await v4.client.post("/api/submit", { historyId: idDelta });
  // v5 votes but never submits a restaurant of their own — voting only
  // needs a full ranking of whatever's already on the table

  const start = await admin.client.post("/api/admin/start-voting", { votingType: "ranked" });
  assert.equal(start.status, 200);

  const state = await admin.client.get("/api/state");
  const Alpha = state.data.state.restaurants.find((r) => r.name === "Alpha Diner").id;
  const Bravo = state.data.state.restaurants.find((r) => r.name === "Bravo Grill").id;
  const Charlie = state.data.state.restaurants.find((r) => r.name === "Charlie Cafe").id;
  const Delta = state.data.state.restaurants.find((r) => r.name === "Delta Kitchen").id;

  await admin.client.post("/api/vote", { order: [Alpha, Bravo, Charlie, Delta] });
  await v2.client.post("/api/vote", { order: [Alpha, Charlie, Bravo, Delta] });
  await v3.client.post("/api/vote", { order: [Bravo, Alpha, Delta, Charlie] });
  await v4.client.post("/api/vote", { order: [Charlie, Delta, Alpha, Bravo] });
  const last = await v5.client.post("/api/vote", { order: [Delta, Charlie, Alpha, Bravo] });

  assert.equal(last.status, 200);
  const final = last.data.state;
  assert.equal(final.phase, "results");
  assert.equal(final.tie, false);
  assert.equal(final.winner.restaurant.id, Alpha);

  const rounds = final.rankedRounds;
  assert.equal(rounds.length, 2, "one elimination round, then an immediate round-2 winner");

  const round1 = rounds[0];
  const round1ById = Object.fromEntries(round1.counts.map((c) => [c.restaurantId, c.votes]));
  assert.equal(round1ById[Alpha], 2);
  assert.equal(round1ById[Bravo], 1);
  assert.equal(round1ById[Charlie], 1);
  assert.equal(round1ById[Delta], 1);
  assert.deepEqual(
    new Set(round1.eliminated),
    new Set([Bravo, Charlie, Delta]),
    "the three tied last-place candidates are eliminated together"
  );

  const round2 = rounds[1];
  assert.equal(round2.eliminated.length, 0);
  assert.equal(round2.counts.length, 1);
  assert.equal(round2.counts[0].restaurantId, Alpha);
  assert.equal(round2.counts[0].votes, 5, "every ballot eventually ranks Alpha above the eliminated three");

  assert.equal(final.winner.points, 5, "final-round vote count");
  assert.equal(final.winner.firstPlaceVotes, 2, "first-choice votes from round 1");

  const win = final.winnerHistory.find((w) => w.name === "Alpha Diner");
  assert.ok(win);
  assert.equal(win.votingType, "ranked");
  assert.equal(win.points, 5);
  assert.equal(win.firstPlaceVotes, 2);
  assert.equal(win.participantCount, 5);
});

// Two candidates, two voters, exactly opposite ballots: a full tie among
// everyone remaining is called as a tie rather than forced to a winner.
test("ranked choice: a full tie among all remaining candidates is called as a tie", async () => {
  const admin = await bootstrapAdmin("ranked-admin-4");
  const b = await createActivatedUser(admin.client, "b-voter-r4");

  const idEcho = await addToHistory(admin.client, "Echo Eatery");
  const idFoxtrot = await addToHistory(admin.client, "Foxtrot Foods");
  await admin.client.post("/api/submit", { historyId: idEcho });
  await b.client.post("/api/submit", { historyId: idFoxtrot });
  await admin.client.post("/api/admin/start-voting", { votingType: "ranked" });

  const state = await admin.client.get("/api/state");
  const Echo = state.data.state.restaurants.find((r) => r.name === "Echo Eatery").id;
  const Foxtrot = state.data.state.restaurants.find((r) => r.name === "Foxtrot Foods").id;

  await admin.client.post("/api/vote", { order: [Echo, Foxtrot] });
  const last = await b.client.post("/api/vote", { order: [Foxtrot, Echo] });

  const final = last.data.state;
  assert.equal(final.phase, "results");
  assert.equal(final.tie, true);
  assert.equal(final.winner, null);
  assert.equal(final.rankedRounds.length, 1);
  assert.equal(
    final.winnerHistory.length,
    0,
    "a fully-tied ranked round should not be logged to history"
  );
});
