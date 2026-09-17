import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { wipeState, bootstrapAdmin, readRawState, writeRawState } from "./helpers/game.mjs";

beforeEach(wipeState);

// Reproduces the shape restaurantHistory had before it gained an `id`
// field: keyed by the submitting username, with no `id` on the entry
// itself. Production briefly had real data in exactly this shape, and
// picking from it broke with "invalid input" until a migration was added.
// This confirms that migration keeps working: the legacy entry gets a
// fresh id, is re-keyed by that id, the fix is written back to disk, and
// re-reading it afterwards doesn't change the id again (idempotent).
test("a legacy restaurant-history entry with no id is migrated on read and the fix persists", async () => {
  const admin = await bootstrapAdmin("migration-admin-1");

  const raw = await readRawState();
  raw.restaurantHistory["someuser"] = {
    username: "someuser",
    name: "Legacy Pizza Place",
    url: "https://example.com/legacy-pizza",
    updatedAt: Date.now(),
    // deliberately no `id` field — this is the pre-refactor shape
  };
  await writeRawState(raw);

  const first = await admin.client.get("/api/state");
  assert.equal(first.status, 200);
  const migrated = first.data.state.history.find((h) => h.name === "Legacy Pizza Place");
  assert.ok(migrated, "the legacy entry should still show up in the list");
  assert.equal(typeof migrated.id, "string");
  assert.ok(migrated.id.length > 0);
  assert.notEqual(migrated.id, "someuser", "it should get a real generated id, not the old key");

  const onDisk = await readRawState();
  assert.ok(
    onDisk.restaurantHistory[migrated.id],
    "the migration should be persisted back to disk, re-keyed by the new id"
  );
  assert.equal(onDisk.restaurantHistory[migrated.id].name, "Legacy Pizza Place");
  assert.ok(
    !onDisk.restaurantHistory["someuser"],
    "the old username-keyed entry should be gone after migration"
  );

  // a second read must be a no-op: same id, not regenerated again
  const second = await admin.client.get("/api/state");
  const migratedAgain = second.data.state.history.find((h) => h.name === "Legacy Pizza Place");
  assert.equal(migratedAgain.id, migrated.id, "migration must be idempotent");

  // and the previously-broken flow now works: picking the migrated entry
  const pick = await admin.client.post("/api/submit", { historyId: migrated.id });
  assert.equal(pick.status, 200);
  const myPick = pick.data.state.restaurants.find((r) => r.submittedBy === "migration-admin-1");
  assert.equal(myPick.name, "Legacy Pizza Place");
});

test("an already-correct (id-keyed) history entry is left untouched by migration", async () => {
  const admin = await bootstrapAdmin("migration-admin-2");
  const raw = await readRawState();
  raw.restaurantHistory["abc12345"] = {
    id: "abc12345",
    username: "migration-admin-2",
    name: "Already Modern Place",
    url: "https://example.com/modern",
    updatedAt: Date.now(),
  };
  await writeRawState(raw);

  const res = await admin.client.get("/api/state");
  const entry = res.data.state.history.find((h) => h.name === "Already Modern Place");
  assert.equal(entry.id, "abc12345", "a well-formed entry should keep its existing id");
});
