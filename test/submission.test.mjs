import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  wipeState,
  bootstrapAdmin,
  createActivatedUser,
  addToHistory,
  findRestaurantIdFor,
} from "./helpers/game.mjs";

beforeEach(wipeState);

test("picking, changing, and removing a pick during submission", async () => {
  const admin = await bootstrapAdmin("sub-admin-1");
  const idBurger = await addToHistory(admin.client, "Burger Joint");
  const idTaco = await addToHistory(admin.client, "Taco Stand");

  const pick1 = await admin.client.post("/api/submit", { historyId: idBurger });
  assert.equal(pick1.status, 200);
  let mine = findRestaurantIdFor(pick1.data.state, "sub-admin-1");
  assert.ok(mine);
  const firstPickId = mine;
  const burgerEntry = pick1.data.state.restaurants.find((r) => r.id === mine);
  assert.equal(burgerEntry.name, "Burger Joint");

  // changing the pick replaces it in place rather than adding a second entry
  const pick2 = await admin.client.post("/api/submit", { historyId: idTaco });
  assert.equal(pick2.status, 200);
  const adminPicks = pick2.data.state.restaurants.filter((r) => r.submittedBy === "sub-admin-1");
  assert.equal(adminPicks.length, 1);
  assert.equal(adminPicks[0].name, "Taco Stand");
  assert.equal(adminPicks[0].id, firstPickId, "the round-level restaurant id is preserved on re-pick");

  const removed = await admin.client.post("/api/remove-pick");
  assert.equal(removed.status, 200);
  assert.ok(!removed.data.state.restaurants.some((r) => r.submittedBy === "sub-admin-1"));

  const removeAgain = await admin.client.post("/api/remove-pick");
  assert.equal(removeAgain.status, 400);
  assert.match(removeAgain.data.error, /haven't submitted/i);
});

test("picking an unknown history id is rejected", async () => {
  const admin = await bootstrapAdmin("sub-admin-2");
  const res = await admin.client.post("/api/submit", { historyId: "does-not-exist" });
  // /api/submit reports every non-auth failure on this route as 403, not
  // 400, even ones that are really "bad input" rather than "forbidden" —
  // confirmed against the running app rather than assumed.
  assert.equal(res.status, 403);
  assert.match(res.data.error, /no such restaurant/i);
});

test("skipping submission counts as done without a pick", async () => {
  const admin = await bootstrapAdmin("sub-admin-3");
  const user = await createActivatedUser(admin.client, "skipper-3");

  const res = await user.client.post("/api/pass");
  assert.equal(res.status, 200);
  const me = res.data.state.users.find((u) => u.username === "skipper-3");
  assert.equal(me.hasSubmitted, true);
  assert.equal(me.passedSubmission, true);
  assert.ok(!res.data.state.restaurants.some((r) => r.submittedBy === "skipper-3"));
});

test("self-editing your own current pick", async () => {
  const admin = await bootstrapAdmin("sub-admin-4");
  const idA = await addToHistory(admin.client, "Original Name");
  const pickRes = await admin.client.post("/api/submit", { historyId: idA });
  const myId = findRestaurantIdFor(pickRes.data.state, "sub-admin-4");

  const edit = await admin.client.post("/api/edit-pick", {
    name: "Edited Name",
    url: "https://example.com/edited",
  });
  assert.equal(edit.status, 200);
  const mine = edit.data.state.restaurants.find((r) => r.id === myId);
  assert.equal(mine.name, "Edited Name");
  assert.equal(mine.url, "https://example.com/edited");
});

test("edit-pick fails for a user with no current pick", async () => {
  const admin = await bootstrapAdmin("sub-admin-5");
  const user = await createActivatedUser(admin.client, "nopick-5");
  const res = await user.client.post("/api/edit-pick", {
    name: "Ghost Restaurant",
    url: "https://example.com/ghost",
  });
  assert.equal(res.status, 400);
  assert.match(res.data.error, /haven't submitted/i);
});

test("edit-pick to a name that collides with someone else's current pick is rejected", async () => {
  const admin = await bootstrapAdmin("sub-admin-6");
  const user = await createActivatedUser(admin.client, "rival-6");
  const idA = await addToHistory(admin.client, "Admin Pick");
  const idB = await addToHistory(admin.client, "Rival Pick");
  await admin.client.post("/api/submit", { historyId: idA });
  await user.client.post("/api/submit", { historyId: idB });

  const collide = await user.client.post("/api/edit-pick", {
    name: "Admin Pick",
    url: "https://example.com/rival",
  });
  assert.equal(collide.status, 400);
});

test("submissions are blocked once the phase leaves submission", async () => {
  const admin = await bootstrapAdmin("sub-admin-7");
  const user = await createActivatedUser(admin.client, "late-7");
  const idA = await addToHistory(admin.client, "First Choice");
  const idB = await addToHistory(admin.client, "Second Choice");
  await admin.client.post("/api/submit", { historyId: idA });
  await user.client.post("/api/submit", { historyId: idB });
  await admin.client.post("/api/admin/start-voting", { votingType: "simple" });

  const lateSubmit = await admin.client.post("/api/submit", { historyId: idA });
  assert.equal(lateSubmit.status, 403);
  assert.match(lateSubmit.data.error, /closed/i);

  const latePass = await admin.client.post("/api/pass");
  assert.equal(latePass.status, 403);

  const lateRemove = await admin.client.post("/api/remove-pick");
  assert.equal(lateRemove.status, 400);
});

test("reactions stack per emoji with no per-user cap, and reject unknown emoji", async () => {
  const admin = await bootstrapAdmin("sub-admin-8");
  const idA = await addToHistory(admin.client, "React Target");
  const pickRes = await admin.client.post("/api/submit", { historyId: idA });
  const restaurantId = findRestaurantIdFor(pickRes.data.state, "sub-admin-8");

  await admin.client.post("/api/react", { restaurantId, emoji: "🔥" });
  const second = await admin.client.post("/api/react", { restaurantId, emoji: "🔥" });
  assert.equal(second.status, 200);
  const target = second.data.state.restaurants.find((r) => r.id === restaurantId);
  assert.equal(target.reactions["🔥"], 2);

  const badEmoji = await admin.client.post("/api/react", { restaurantId, emoji: "🍕" });
  assert.equal(badEmoji.status, 400);

  const badTarget = await admin.client.post("/api/react", { restaurantId: "nope", emoji: "😍" });
  assert.equal(badTarget.status, 400);
});

test("a user marked not-coming cannot pick, and their pick actions are blocked until they toggle back in", async () => {
  const admin = await bootstrapAdmin("sub-admin-9");
  const user = await createActivatedUser(admin.client, "spectator-9");
  const idA = await addToHistory(admin.client, "Spectator Bait");

  const markNotComing = await user.client.post("/api/not-coming", { value: true });
  assert.equal(markNotComing.status, 200);
  const meAfter = markNotComing.data.state.users.find((u) => u.username === "spectator-9");
  assert.equal(meAfter.notComing, true);

  const blockedPick = await user.client.post("/api/submit", { historyId: idA });
  assert.equal(blockedPick.status, 403);
  assert.match(blockedPick.data.error, /not coming/i);

  const backIn = await user.client.post("/api/not-coming", { value: false });
  assert.equal(backIn.status, 200);
  const okPick = await user.client.post("/api/submit", { historyId: idA });
  assert.equal(okPick.status, 200);
});

test("a kicked user's session dies on their very next request", async () => {
  const admin = await bootstrapAdmin("sub-admin-10");
  const user = await createActivatedUser(admin.client, "kickme-10");

  const kick = await admin.client.post("/api/admin/remove-user", { username: "kickme-10" });
  assert.equal(kick.status, 200);

  const nextCall = await user.client.post("/api/pass");
  assert.equal(nextCall.status, 401);

  const me = await user.client.get("/api/auth/me");
  assert.equal(me.data.user, null, "session should be destroyed server-side after the kick");
});
