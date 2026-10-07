import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { wipeState, bootstrapAdmin, createActivatedUser, addToHistory } from "./helpers/game.mjs";
import { createClient } from "./helpers/client.mjs";

beforeEach(wipeState);

// Each resolved round keeps a frozen copy of how it played out so History can
// replay it. The copy is served on demand (never in the polled state), and
// goes away with its hall-of-fame entry.

async function simpleRound(admin, voter, name) {
  const idWin = await addToHistory(admin.client, name);
  const idOther = await addToHistory(admin.client, `${name} Other`);
  await admin.client.post("/api/submit", { historyId: idWin });
  await voter.client.post("/api/submit", { historyId: idOther });
  await admin.client.post("/api/admin/start-voting", { votingType: "simple" });
  const state = await admin.client.get("/api/state");
  const winId = state.data.state.restaurants.find((r) => r.name === name).id;
  await admin.client.post("/api/vote", { order: [winId] });
  const last = await voter.client.post("/api/vote", { order: [winId] });
  return last.data.state.winnerHistory.find((w) => w.name === name);
}

test("polled state flags replays but never carries the ballots; /api/replay serves them", async () => {
  const admin = await bootstrapAdmin("replay-admin-1");
  const voter = await createActivatedUser(admin.client, "replay-voter-1");
  const win = await simpleRound(admin, voter, "Replayable Place");

  assert.equal(win.hasReplay, true);
  assert.equal(win.round, undefined, "ballots must not ride along on every poll");

  const res = await voter.client.get(`/api/replay?id=${win.id}`);
  assert.equal(res.status, 200);
  const { round } = res.data;
  assert.deepEqual(
    round.votes.map((v) => v.username).sort(),
    ["replay-admin-1", "replay-voter-1"]
  );
  assert.equal(round.restaurants.length, 2);
  const top = round.scores[0];
  assert.equal(round.restaurants.find((r) => r.id === top.restaurantId).name, "Replayable Place");
  assert.equal(top.points, 2);
  assert.equal(round.rankedRounds, null, "only ranked rounds carry runoff rounds");
});

test("replay needs a login and a real id, and dies with its hall-of-fame entry", async () => {
  const admin = await bootstrapAdmin("replay-admin-2");
  const voter = await createActivatedUser(admin.client, "replay-voter-2");
  const win = await simpleRound(admin, voter, "Short Lived Replay");

  const anon = await createClient().get(`/api/replay?id=${win.id}`);
  assert.equal(anon.status, 401);
  const unknown = await admin.client.get("/api/replay?id=nope");
  assert.equal(unknown.status, 404);

  await admin.client.post("/api/admin/delete-winner", { id: win.id });
  const gone = await admin.client.get(`/api/replay?id=${win.id}`);
  assert.equal(gone.status, 404);
});

test("a ranked round's replay keeps every runoff round", async () => {
  const admin = await bootstrapAdmin("replay-admin-3");
  const u2 = await createActivatedUser(admin.client, "replay-u2");
  const u3 = await createActivatedUser(admin.client, "replay-u3");
  const u4 = await createActivatedUser(admin.client, "replay-u4");
  const ids = {};
  for (const [who, name] of [
    [admin, "Rank A"],
    [u2, "Rank B"],
    [u3, "Rank C"],
  ]) {
    ids[name] = await addToHistory(admin.client, name);
    await who.client.post("/api/submit", { historyId: ids[name] });
  }
  await admin.client.post("/api/admin/start-voting", { votingType: "ranked" });
  const st = (await admin.client.get("/api/state")).data.state;
  const id = (n) => st.restaurants.find((r) => r.name === n).id;
  const [A, B, C] = [id("Rank A"), id("Rank B"), id("Rank C")];
  await admin.client.post("/api/vote", { order: [A, C, B] });
  await u2.client.post("/api/vote", { order: [A, B, C] });
  await u3.client.post("/api/vote", { order: [B, A, C] });
  const last = await u4.client.post("/api/vote", { order: [C, B, A] });
  const win = last.data.state.winnerHistory.find((w) => w.name === "Rank A");
  assert.ok(win, "A wins once B and C are eliminated together");

  const { round } = (await admin.client.get(`/api/replay?id=${win.id}`)).data;
  assert.equal(round.rankedRounds.length, 2);
  assert.deepEqual([...round.rankedRounds[0].eliminated].sort(), [B, C].sort());
});

test("a not-coming user can't react, even by calling the API directly", async () => {
  const admin = await bootstrapAdmin("react-admin-1");
  const out = await createActivatedUser(admin.client, "react-out-1");
  const id = await addToHistory(admin.client, "Reactable");
  await admin.client.post("/api/submit", { historyId: id });
  const rid = (await admin.client.get("/api/state")).data.state.restaurants[0].id;

  const ok = await out.client.post("/api/react", { restaurantId: rid, emoji: "🔥" });
  assert.equal(ok.status, 200, "coming is the default, so reacting works");

  await out.client.post("/api/not-coming", { value: true });
  const blocked = await out.client.post("/api/react", { restaurantId: rid, emoji: "🔥" });
  assert.equal(blocked.status, 400);
  assert.match(blocked.data.error, /not coming/i);

  const state = (await admin.client.get("/api/state")).data.state;
  assert.equal(state.restaurants[0].reactions["🔥"], 1, "the blocked reaction wasn't counted");
});
