import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { wipeState, bootstrapAdmin, createActivatedUser } from "./helpers/game.mjs";

beforeEach(wipeState);

async function addEntry(client, name) {
  const res = await client.post("/api/add-suggestion", { name, url: "https://example.com/menu" });
  return res.data.state.history.find((h) => h.name === name);
}

test("list entries have no dodgy flag until an admin sets one", async () => {
  const admin = await bootstrapAdmin("dodgy-admin-1");
  const goat = await addEntry(admin.client, "Rodeo Goat");
  // Unset means "use the default" (on for Rodeo Goat), decided client-side.
  assert.equal(goat.dodgy, undefined);
});

test("an admin can turn the Rodeo Goat treatment on and off for any restaurant", async () => {
  const admin = await bootstrapAdmin("dodgy-admin-2");
  const taco = await addEntry(admin.client, "Taco Town");

  const on = await admin.client.post("/api/admin/set-dodgy", { id: taco.id, value: true });
  assert.equal(on.status, 200);
  assert.equal(on.data.state.history.find((h) => h.id === taco.id).dodgy, true);

  const off = await admin.client.post("/api/admin/set-dodgy", { id: taco.id, value: false });
  assert.equal(off.status, 200);
  assert.equal(off.data.state.history.find((h) => h.id === taco.id).dodgy, false);
});

test("setting the flag is admin-only and validates its input", async () => {
  const admin = await bootstrapAdmin("dodgy-admin-3");
  const goat = await addEntry(admin.client, "Rodeo Goat");
  const user = await createActivatedUser(admin.client, "dodgy-user-3");

  const forbidden = await user.client.post("/api/admin/set-dodgy", { id: goat.id, value: false });
  assert.equal(forbidden.status, 403);

  const missing = await admin.client.post("/api/admin/set-dodgy", { id: "nope", value: true });
  assert.equal(missing.status, 400);

  const noValue = await admin.client.post("/api/admin/set-dodgy", { id: goat.id });
  assert.equal(noValue.status, 400);
});

test("the flag survives editing the entry and resetting the round", async () => {
  const admin = await bootstrapAdmin("dodgy-admin-4");
  const goat = await addEntry(admin.client, "Rodeo Goat");
  await admin.client.post("/api/admin/set-dodgy", { id: goat.id, value: false });

  await admin.client.post("/api/admin/edit-history", {
    id: goat.id,
    name: "Rodeo Goat",
    url: "https://example.com/new-menu",
  });
  const reset = await admin.client.post("/api/admin/reset");
  assert.equal(reset.status, 200);

  const state = await admin.client.get("/api/state");
  const after = (state.data.state ?? state.data).history.find((h) => h.id === goat.id);
  assert.equal(after.dodgy, false);
  assert.equal(after.url, "https://example.com/new-menu");
});

test("an admin can set how many dodges it takes, within 1 to 30", async () => {
  const admin = await bootstrapAdmin("dodgy-admin-5");
  const goat = await addEntry(admin.client, "Rodeo Goat");
  // Unset means the default of 8, decided client-side.
  assert.equal(goat.dodgeTries, undefined);

  const set = await admin.client.post("/api/admin/set-dodgy", { id: goat.id, tries: 3 });
  assert.equal(set.status, 200);
  const after = set.data.state.history.find((h) => h.id === goat.id);
  assert.equal(after.dodgeTries, 3);
  // Changing only the count leaves the on/off flag alone.
  assert.equal(after.dodgy, undefined);

  for (const bad of [0, 31, 2.5, "5"]) {
    const res = await admin.client.post("/api/admin/set-dodgy", { id: goat.id, tries: bad });
    assert.equal(res.status, 400, `tries=${JSON.stringify(bad)} should be rejected`);
  }

  // On/off and count can be set together, and the count survives turning it off.
  const both = await admin.client.post("/api/admin/set-dodgy", {
    id: goat.id,
    value: false,
    tries: 12,
  });
  assert.equal(both.status, 200);
  const final = both.data.state.history.find((h) => h.id === goat.id);
  assert.equal(final.dodgy, false);
  assert.equal(final.dodgeTries, 12);
});

test("only admins can change the dodge count", async () => {
  const admin = await bootstrapAdmin("dodgy-admin-6");
  const goat = await addEntry(admin.client, "Rodeo Goat");
  const user = await createActivatedUser(admin.client, "dodgy-user-6");
  const res = await user.client.post("/api/admin/set-dodgy", { id: goat.id, tries: 2 });
  assert.equal(res.status, 403);
});
