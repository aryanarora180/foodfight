import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { wipeState, bootstrapAdmin, createActivatedUser, addToHistory } from "./helpers/game.mjs";

beforeEach(wipeState);

test("starting a vote is admin-only and needs at least 2 restaurants", async () => {
  const admin = await bootstrapAdmin("simple-admin-1");
  const user = await createActivatedUser(admin.client, "voter-1a");

  const nonAdminStart = await user.client.post("/api/admin/start-voting", { votingType: "simple" });
  assert.equal(nonAdminStart.status, 403);

  const idOnly = await addToHistory(admin.client, "Only Option");
  await admin.client.post("/api/submit", { historyId: idOnly });
  const tooFew = await admin.client.post("/api/admin/start-voting", { votingType: "simple" });
  assert.equal(tooFew.status, 400);
  assert.match(tooFew.data.error, /at least 2/i);
});

test("simple voting: most first-choice votes wins, phase stays open until everyone's voted", async () => {
  const admin = await bootstrapAdmin("simple-admin-2");
  const bob = await createActivatedUser(admin.client, "bob-2");
  const cyn = await createActivatedUser(admin.client, "cyn-2");

  const idR1 = await addToHistory(admin.client, "Restaurant One");
  const idR2 = await addToHistory(admin.client, "Restaurant Two");
  const idR3 = await addToHistory(admin.client, "Restaurant Three");
  await admin.client.post("/api/submit", { historyId: idR1 });
  await bob.client.post("/api/submit", { historyId: idR2 });
  await cyn.client.post("/api/submit", { historyId: idR3 });

  const start = await admin.client.post("/api/admin/start-voting", { votingType: "simple" });
  assert.equal(start.status, 200);
  assert.equal(start.data.state.phase, "voting");

  const stateBefore = await admin.client.get("/api/state");
  const r1 = stateBefore.data.state.restaurants.find((r) => r.name === "Restaurant One").id;
  const r2 = stateBefore.data.state.restaurants.find((r) => r.name === "Restaurant Two").id;

  // voting for something not on the current round's list is rejected
  const badVote = await admin.client.post("/api/vote", { order: ["not-a-real-id"] });
  assert.equal(badVote.status, 400);

  await admin.client.post("/api/vote", { order: [r1] });
  await bob.client.post("/api/vote", { order: [r1] });

  const midVote = await admin.client.get("/api/state");
  assert.equal(midVote.data.state.phase, "voting", "phase stays open until everyone's voted");
  // NOTE: the "ballots stay hidden until results are in" promise (README,
  // VotingPhase's "ballots stay hidden" copy) is a UI-only convention — no
  // screen ever renders `state.votes` before the results phase — but the
  // raw /api/state response does already include full ballots (who voted
  // for what) for everyone who's voted so far, even mid-voting. Asserting
  // the real, current shape here rather than the UI-implied one.
  assert.equal(midVote.data.state.votes.length, 2, "two of three ballots cast so far");
  const midVoteUsernames = midVote.data.state.votes.map((v) => v.username).sort();
  assert.deepEqual(midVoteUsernames, ["bob-2", "simple-admin-2"]);

  const last = await cyn.client.post("/api/vote", { order: [r2] });
  assert.equal(last.status, 200);
  assert.equal(last.data.state.phase, "results", "phase auto-flips once everyone's voted");

  const final = last.data.state;
  assert.equal(final.tie, false);
  assert.equal(final.winner.restaurant.name, "Restaurant One");
  assert.equal(final.winner.points, 2);
  const sortedNames = final.scores.map((s) => s.restaurant.name);
  assert.deepEqual(sortedNames, ["Restaurant One", "Restaurant Two", "Restaurant Three"]);
  assert.deepEqual(
    final.scores.map((s) => s.points),
    [2, 1, 0]
  );

  const win = final.winnerHistory[0];
  assert.equal(win.name, "Restaurant One");
  assert.equal(win.votingType, "simple");
  assert.equal(win.points, 2);
  assert.equal(win.firstPlaceVotes, 2);
  assert.equal(win.participantCount, 3);
});

test("simple vote rejects submitting more than one pick, and voting outside the voting phase", async () => {
  const admin = await bootstrapAdmin("simple-admin-3");
  const user = await createActivatedUser(admin.client, "voter-3");
  const idA = await addToHistory(admin.client, "A Place");
  const idB = await addToHistory(admin.client, "B Place");
  await admin.client.post("/api/submit", { historyId: idA });
  await user.client.post("/api/submit", { historyId: idB });

  const tooEarly = await admin.client.post("/api/vote", { order: [] });
  assert.equal(tooEarly.status, 400);

  await admin.client.post("/api/admin/start-voting", { votingType: "simple" });
  const state = await admin.client.get("/api/state");
  const ids = state.data.state.restaurants.map((r) => r.id);

  const twoIds = await admin.client.post("/api/vote", { order: ids });
  assert.equal(twoIds.status, 400);
  assert.match(twoIds.data.error, /pick exactly one/i);
});

test("a not-coming user is excluded from the required-voter count and can't vote", async () => {
  const admin = await bootstrapAdmin("simple-admin-4");
  const bob = await createActivatedUser(admin.client, "bob-4");
  const spectator = await createActivatedUser(admin.client, "ghost-4");

  const idA = await addToHistory(admin.client, "Alpha");
  const idB = await addToHistory(admin.client, "Beta");
  await admin.client.post("/api/submit", { historyId: idA });
  await bob.client.post("/api/submit", { historyId: idB });

  await spectator.client.post("/api/not-coming", { value: true });
  await admin.client.post("/api/admin/start-voting", { votingType: "simple" });

  const notComingVote = await spectator.client.post("/api/vote", { order: ["whatever"] });
  assert.equal(notComingVote.status, 400);
  assert.match(notComingVote.data.error, /not coming/i);

  const state = await admin.client.get("/api/state");
  const requiredVoters = state.data.state.users.filter((u) => !u.notComing);
  assert.equal(requiredVoters.length, 2, "the spectator should not count toward required voters");

  const r1 = state.data.state.restaurants[0].id;
  await admin.client.post("/api/vote", { order: [r1] });
  const afterSecondVote = await bob.client.post("/api/vote", { order: [r1] });
  assert.equal(
    afterSecondVote.data.state.phase,
    "results",
    "only the two active participants should be required to close the round"
  );
});
