import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "./helpers/client.mjs";
import { wipeState, bootstrapAdmin, createActivatedUser } from "./helpers/game.mjs";

beforeEach(wipeState);

test("adding a restaurant to the shared list requires login", async () => {
  const client = createClient();
  const res = await client.post("/api/add-suggestion", {
    name: "Big Jon's Pizza",
    url: "https://example.com/bigjons",
  });
  assert.equal(res.status, 401);
});

test("a logged-in user can add a restaurant with a name and a valid menu URL", async () => {
  const admin = await bootstrapAdmin("list-admin-1");
  const res = await admin.client.post("/api/add-suggestion", {
    name: "Big Jon's Pizza",
    url: "https://example.com/bigjons",
  });
  assert.equal(res.status, 200);
  const entry = res.data.state.history.find((h) => h.name === "Big Jon's Pizza");
  assert.ok(entry, "new entry should appear in history");
  assert.equal(entry.url, "https://example.com/bigjons");
  assert.equal(entry.username, "list-admin-1");
  assert.ok(entry.id && entry.id.length > 0);
});

test("missing name or invalid URL is rejected", async () => {
  const admin = await bootstrapAdmin("list-admin-2");
  const noName = await admin.client.post("/api/add-suggestion", {
    name: "",
    url: "https://example.com",
  });
  assert.equal(noName.status, 400);

  const badUrl = await admin.client.post("/api/add-suggestion", {
    name: "Taco Town",
    url: "not-a-url",
  });
  assert.equal(badUrl.status, 400);
});

test("duplicate restaurant names (case-insensitive) are rejected", async () => {
  const admin = await bootstrapAdmin("list-admin-3");
  await admin.client.post("/api/add-suggestion", {
    name: "Noodle House",
    url: "https://example.com/noodle",
  });
  const dupe = await admin.client.post("/api/add-suggestion", {
    name: "noodle house",
    url: "https://example.com/noodle-2",
  });
  assert.equal(dupe.status, 400);
  assert.match(dupe.data.error, /already in the vault/i);
});

test("the restaurant list is returned sorted alphabetically by name", async () => {
  const admin = await bootstrapAdmin("list-admin-4");
  await admin.client.post("/api/add-suggestion", { name: "Zebra Diner", url: "https://example.com/z" });
  await admin.client.post("/api/add-suggestion", { name: "Apple Bistro", url: "https://example.com/a" });
  await admin.client.post("/api/add-suggestion", { name: "Mango Grill", url: "https://example.com/m" });

  const state = await admin.client.get("/api/state");
  const names = state.data.state.history.map((h) => h.name);
  assert.deepEqual(names, ["Apple Bistro", "Mango Grill", "Zebra Diner"]);
});

test("adding a restaurant works regardless of the current round phase", async () => {
  const admin = await bootstrapAdmin("list-admin-5");
  const user = await createActivatedUser(admin.client, "pat-5");
  const idA = (
    await admin.client.post("/api/add-suggestion", { name: "Round Food A", url: "https://example.com/a" })
  ).data.state.history.find((h) => h.name === "Round Food A").id;
  await admin.client.post("/api/add-suggestion", { name: "Round Food B", url: "https://example.com/b" });
  await admin.client.post("/api/submit", { historyId: idA });
  await user.client.post("/api/submit", {
    historyId: (await admin.client.get("/api/state")).data.state.history.find(
      (h) => h.name === "Round Food B"
    ).id,
  });
  const start = await admin.client.post("/api/admin/start-voting", { votingType: "simple" });
  assert.equal(start.status, 200);

  const addDuringVoting = await admin.client.post("/api/add-suggestion", {
    name: "Added Mid-Vote",
    url: "https://example.com/mid",
  });
  assert.equal(addDuringVoting.status, 200);
});

test("admins can edit and delete list entries; non-admins cannot", async () => {
  const admin = await bootstrapAdmin("list-admin-6");
  const user = await createActivatedUser(admin.client, "pat-6");
  const addRes = await admin.client.post("/api/add-suggestion", {
    name: "Editable Place",
    url: "https://example.com/orig",
  });
  const id = addRes.data.state.history.find((h) => h.name === "Editable Place").id;

  const nonAdminEdit = await user.client.post("/api/admin/edit-history", {
    id,
    name: "Hacked Name",
    url: "https://example.com/orig",
  });
  assert.equal(nonAdminEdit.status, 403);

  const edit = await admin.client.post("/api/admin/edit-history", {
    id,
    name: "Renamed Place",
    url: "https://example.com/new",
  });
  assert.equal(edit.status, 200);
  const renamed = edit.data.state.history.find((h) => h.id === id);
  assert.equal(renamed.name, "Renamed Place");
  assert.equal(renamed.url, "https://example.com/new");

  const nonAdminDelete = await user.client.post("/api/admin/delete-history", { id });
  assert.equal(nonAdminDelete.status, 403);

  const del = await admin.client.post("/api/admin/delete-history", { id });
  assert.equal(del.status, 200);
  assert.ok(!del.data.state.history.some((h) => h.id === id));

  const deleteUnknown = await admin.client.post("/api/admin/delete-history", { id: "nope" });
  assert.equal(deleteUnknown.status, 400);
});

test("editing a list entry to a name that collides with another entry is rejected", async () => {
  const admin = await bootstrapAdmin("list-admin-7");
  await admin.client.post("/api/add-suggestion", { name: "Sushi Spot", url: "https://example.com/sushi" });
  const addRes = await admin.client.post("/api/add-suggestion", {
    name: "Burger Barn",
    url: "https://example.com/burger",
  });
  const burgerId = addRes.data.state.history.find((h) => h.name === "Burger Barn").id;

  const collide = await admin.client.post("/api/admin/edit-history", {
    id: burgerId,
    name: "sushi spot",
    url: "https://example.com/burger",
  });
  assert.equal(collide.status, 400);
});
