# Behavior tests

Black-box regression tests written against the app's documented behavior
(the root [README.md](../README.md) and [CLAUDE.md](../CLAUDE.md)), not
against the implementation — they talk to a real running server over HTTP
and a real (file-backed) game state, no mocking.

## Running

```bash
npm test
```

This boots an isolated `next dev` server on port 3100 against its own
scratch data file (`.data/test-state.json`), runs every `test/*.test.mjs`
file against it with Node's built-in test runner, then shuts the server
down. It never touches a developer's own `.data/state.json`, a real Redis
database, or `.env.local`'s `REDIS_URL`/`ADMIN_USERNAMES` — those are
explicitly overridden for the test server regardless of what's in the
environment.

Test files run one at a time (`--test-concurrency=1`), never in parallel:
the app is a single shared game state, not multi-tenant, so two test files
mutating it at the same time would corrupt each other's scenarios. Within
a file, each `before()` hook wipes the scratch state completely, so every
file starts from a genuinely empty app (no users, no restaurants, no
history) — pick unique usernames/restaurant names per test within a file to
avoid collisions with earlier tests in the same file, since state
accumulates across tests within one file.

## What's covered

- `auth.test.mjs` — bootstrap-first-admin, login/logout, password
  requirements, admin-created accounts and forced password change,
  password reset.
- `restaurants.test.mjs` — the shared restaurant list: add/edit/delete,
  duplicate-name rejection, alphabetical ordering, phase-independence.
- `submission.test.mjs` — picking from the list, changing/removing a pick,
  self-editing your pick, skipping, reactions, not-coming blocking
  submission actions, a kicked user's session dying immediately.
- `voting-simple.test.mjs`, `voting-points.test.mjs`,
  `voting-ranked.test.mjs` — all three voting formats, hand-computed
  expected scores/winners (see the comments above each ranked-choice
  scenario for the by-hand math), ties, sealed ballots, the
  not-coming-excludes-from-required-voters rule.
- `admin.test.mjs` — every admin-only control: kicking one or everyone,
  password resets, reveal, reset, and restaurant/pick editing, each
  checked for the 403 an admin route should return to a non-admin caller.
- `history.test.mjs` — the hall-of-fame log: shape of a logged win, that it
  survives "reset everything," admin-only removal, newest-first ordering.
- `spectating.test.mjs` — the not-coming flag persisting across a reset,
  and that spectators see everything a participant sees with no early
  access to sealed ballots.
- `migration.test.mjs` — the legacy (pre-id) `restaurantHistory` shape gets
  backfilled with an id on read, persisted, and left alone on a second
  read; a well-formed entry is never touched.

## What's not covered

Anything that only lives in the client (React state, animations, CSS,
layout, what a component renders) — this suite talks to the API layer
only. Visual/UI behavior was checked manually during development; if you
change UI logic that has no server-side counterpart (e.g. how the
"skip ⏭️" button on the results playback behaves), verify it by hand in the
browser.

## If a test fails

If the assertion is correct per the README/CLAUDE.md and the app disagrees,
that's a real regression — fix the app. If the app's actual behavior is
correct and the test's expectation was wrong when it was written, fix the
test and update the docs in the same change so they stay in sync.
