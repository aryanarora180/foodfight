import { test } from "node:test";
import assert from "node:assert/strict";

// lib/recentWins.ts is pure, so it's checked directly (no server needed).
// Node strips the types when importing the .ts file.
const { lastWonByName, wonText } = await import("../lib/recentWins.ts");
const { computeBadges } = await import("../lib/badges.ts");

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 6);
const win = (name, submittedBy, daysAgo) => ({
  id: `${name}-${daysAgo}`,
  name,
  submittedBy,
  decidedAt: now - daysAgo * DAY,
});

test("won labels read plainly and fade out after a few months", () => {
  const last = lastWonByName([win("Chipotle", "sam", 0), win("Thai Palace", "kim", 1)]);
  assert.equal(wonText(last, "Chipotle", now), "won today");
  assert.equal(wonText(last, "  thai palace ", now), "won yesterday", "names match case-insensitively");
  assert.equal(wonText(last, "Nowhere", now), null);

  const older = lastWonByName([win("A", "x", 5), win("B", "x", 14), win("C", "x", 30), win("D", "x", 70), win("E", "x", 120)]);
  assert.equal(wonText(older, "A", now), "won 5 days ago");
  assert.equal(wonText(older, "B", now), "won 2 weeks ago");
  assert.equal(wonText(older, "C", now), "won 4 weeks ago");
  assert.equal(wonText(older, "D", now), "won 2 months ago");
  assert.equal(wonText(older, "E", now), null, "too old to matter");
});

test("only the latest win per place counts", () => {
  const last = lastWonByName([win("Chipotle", "sam", 40), win("Chipotle", "sam", 3)]);
  assert.equal(wonText(last, "Chipotle", now), "won 3 days ago");
});

test("badges come from the hall of fame", () => {
  const goats = new Set(["rodeo goat"]);
  const history = [
    win("Chipotle", "sam", 0),
    win("Chipotle", "sam", 7),
    win("Rodeo Goat", "kim", 14),
    win("Thai Palace", "sam", 21),
  ];
  const badges = computeBadges(history, goats);
  const byId = Object.fromEntries(badges.map((b) => [b.id, b]));
  assert.equal(byId["on-a-roll"].who, "sam");
  assert.equal(byId["on-a-roll"].detail, "2 wins in a row");
  assert.equal(byId["back-to-back"].who, "Chipotle");
  assert.equal(byId["kingmaker-sam"].detail, "3 winning picks");
  assert.equal(byId["goat-kim"].who, "kim");
  assert.equal(computeBadges([win("Solo", "sam", 0)], goats).length, 0, "one win earns nothing yet");
});
