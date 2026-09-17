import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { wipeState, bootstrapAdmin, createActivatedUser, addToHistory } from "./helpers/game.mjs";

beforeEach(wipeState);

test("remove-user strips their pick, vote, and pass flag, and can't target yourself", async () => {
  const admin = await bootstrapAdmin("admin-a1");
  const target = await createActivatedUser(admin.client, "target-a1");
  const idA = await addToHistory(admin.client, "Doomed Pick");
  await target.client.post("/api/submit", { historyId: idA });

  const selfRemove = await admin.client.post("/api/admin/remove-user", { username: "admin-a1" });
  assert.equal(selfRemove.status, 400);

  const res = await admin.client.post("/api/admin/remove-user", { username: "target-a1" });
  assert.equal(res.status, 200);
  assert.ok(!res.data.state.users.some((u) => u.username === "target-a1"));
  assert.ok(!res.data.state.restaurants.some((r) => r.submittedBy === "target-a1"));

  // the kicked user's own next request should be rejected and their
  // session destroyed server-side (see submission.test.mjs for the
  // dedicated coverage of this pattern across mutating routes)
  const nextCall = await target.client.post("/api/pass");
  assert.equal(nextCall.status, 401);
});

test("remove-all-users wipes every non-admin account and their round data, admins survive", async () => {
  const admin = await bootstrapAdmin("admin-a2");
  const admin2 = await createActivatedUser(admin.client, "co-admin-a2", { isAdmin: true });
  const u1 = await createActivatedUser(admin.client, "gone-a2-1");
  const u2 = await createActivatedUser(admin.client, "gone-a2-2");
  const idA = await addToHistory(admin.client, "Casualty Pick");
  await u1.client.post("/api/submit", { historyId: idA });

  const res = await admin.client.post("/api/admin/remove-all-users", {});
  assert.equal(res.status, 200);
  const usernames = res.data.state.users.map((u) => u.username);
  assert.ok(usernames.includes("admin-a2"));
  assert.ok(usernames.includes("co-admin-a2"));
  assert.ok(!usernames.includes("gone-a2-1"));
  assert.ok(!usernames.includes("gone-a2-2"));
  assert.equal(res.data.state.restaurants.length, 0);

  void admin2;
  void u2;
});

test("admin can mark/unmark any user's not-coming flag; non-admins and unknown users are rejected", async () => {
  const admin = await bootstrapAdmin("admin-a3");
  const user = await createActivatedUser(admin.client, "target-a3");

  const byNonAdmin = await user.client.post("/api/admin/set-not-coming", {
    username: "admin-a3",
    value: true,
  });
  assert.equal(byNonAdmin.status, 403);

  const res = await admin.client.post("/api/admin/set-not-coming", {
    username: "target-a3",
    value: true,
  });
  assert.equal(res.status, 200);
  assert.equal(res.data.state.users.find((u) => u.username === "target-a3").notComing, true);

  const unknown = await admin.client.post("/api/admin/set-not-coming", {
    username: "ghost",
    value: true,
  });
  assert.equal(unknown.status, 400);
});

test("reset everything clears round state (including voting type back to points) but keeps accounts and the shared list", async () => {
  const admin = await bootstrapAdmin("admin-a4");
  const user = await createActivatedUser(admin.client, "voter-a4");
  const idA = await addToHistory(admin.client, "Survives Reset");
  const idB = await addToHistory(admin.client, "Also Survives");
  await admin.client.post("/api/submit", { historyId: idA });
  await user.client.post("/api/submit", { historyId: idB });
  await admin.client.post("/api/admin/start-voting", { votingType: "ranked" });

  const res = await admin.client.post("/api/admin/reset", {});
  assert.equal(res.status, 200);
  const s = res.data.state;
  assert.equal(s.phase, "submission");
  assert.equal(s.votingType, "points", "reset always returns to the default points format");
  assert.equal(s.restaurants.length, 0);
  assert.equal(s.votes.length, 0);
  assert.equal(s.users.length, 2, "accounts are untouched by reset");
  assert.equal(s.history.length, 2, "the shared restaurant list is untouched by reset");

  const byNonAdmin = await user.client.post("/api/admin/reset", {});
  assert.equal(byNonAdmin.status, 403);
});

test("reveal forces an early result during voting only, and is admin-only", async () => {
  const admin = await bootstrapAdmin("admin-a5");
  const user = await createActivatedUser(admin.client, "voter-a5");
  const idA = await addToHistory(admin.client, "Forced A");
  const idB = await addToHistory(admin.client, "Forced B");
  await admin.client.post("/api/submit", { historyId: idA });
  await user.client.post("/api/submit", { historyId: idB });

  const tooEarly = await admin.client.post("/api/admin/reveal", {});
  assert.equal(tooEarly.status, 400);
  assert.match(tooEarly.data.error, /not currently voting/i);

  await admin.client.post("/api/admin/start-voting", { votingType: "simple" });
  const state = await admin.client.get("/api/state");
  const r1 = state.data.state.restaurants[0].id;
  await admin.client.post("/api/vote", { order: [r1] }); // only one of two votes cast

  const byNonAdmin = await user.client.post("/api/admin/reveal", {});
  assert.equal(byNonAdmin.status, 403);

  const forced = await admin.client.post("/api/admin/reveal", {});
  assert.equal(forced.status, 200);
  assert.equal(forced.data.state.phase, "results");
});

test("delete-restaurant only works during submission, and is admin-only", async () => {
  const admin = await bootstrapAdmin("admin-a6");
  const user = await createActivatedUser(admin.client, "voter-a6");
  const idA = await addToHistory(admin.client, "Removable A");
  const idB = await addToHistory(admin.client, "Removable B");
  await admin.client.post("/api/submit", { historyId: idA });
  const pickRes = await user.client.post("/api/submit", { historyId: idB });
  const userPickId = pickRes.data.state.restaurants.find((r) => r.submittedBy === "voter-a6").id;

  const byNonAdmin = await user.client.post("/api/admin/delete-restaurant", { id: userPickId });
  assert.equal(byNonAdmin.status, 403);

  const unknown = await admin.client.post("/api/admin/delete-restaurant", { id: "nope" });
  assert.equal(unknown.status, 400);

  await admin.client.post("/api/admin/start-voting", { votingType: "simple" });
  const duringVoting = await admin.client.post("/api/admin/delete-restaurant", { id: userPickId });
  assert.equal(duringVoting.status, 400);
  assert.match(duringVoting.data.error, /during submissions/i);
});

test("edit-restaurant updates a round pick without changing who submitted it, and rejects name collisions", async () => {
  const admin = await bootstrapAdmin("admin-a7");
  const user = await createActivatedUser(admin.client, "voter-a7");
  const idA = await addToHistory(admin.client, "Edit Me");
  const idB = await addToHistory(admin.client, "Other Pick");
  const pickA = await admin.client.post("/api/submit", { historyId: idA });
  const myPickId = pickA.data.state.restaurants.find((r) => r.submittedBy === "admin-a7").id;
  await user.client.post("/api/submit", { historyId: idB });

  const edit = await admin.client.post("/api/admin/edit-restaurant", {
    id: myPickId,
    name: "Edited By Admin",
    url: "https://example.com/edited-by-admin",
  });
  assert.equal(edit.status, 200);
  const updated = edit.data.state.restaurants.find((r) => r.id === myPickId);
  assert.equal(updated.name, "Edited By Admin");
  assert.equal(updated.submittedBy, "admin-a7");

  const collide = await admin.client.post("/api/admin/edit-restaurant", {
    id: myPickId,
    name: "Other Pick",
    url: "https://example.com/collide",
  });
  assert.equal(collide.status, 400);
});
