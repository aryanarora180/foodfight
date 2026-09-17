# 🎰 Food Fight

A gamified, slot-machine-themed lunch picker for your team. Everyone picks a
restaurant from the shared list, the group votes in whatever format the admin
chooses, and the house reveals a winner. Confetti and drama included.

## Navigation

A full-width banner sits across the top of every screen with the brand and
the blinking casino-bulb treatment. Below it, navigation splits by screen
size, the same way a Mac app's sidebar collapses to an iPhone tab bar:
- **Vote** 🎰 — the live round: roster, and whichever phase is active (pick /
  vote / results). This is home base.
- **Restaurants** 🍽️ — the full shared restaurant list, with an "add a
  restaurant" button. Just the list, nothing else. To actually submit or
  change your pick for the *current* round, that stays on Vote.
- **History** 🏆 — the hall of fame: top restaurant, top picker, and every
  past winner, permanently logged.
- **Admin** 👑 — admin-only. Round controls and account management, out of
  everyone else's way.

## Features

### Accounts & auth
- Admin-created accounts only, with one bootstrap exception: the very first
  person to log in becomes admin automatically (or whoever's listed in
  `ADMIN_USERNAMES`, see below).
- Every account needs a real password. Admin-created accounts get a one-time
  temp password and are forced to set a real one on first login
  (`mustChangePassword`), locked to a "set a real password" screen until they
  do, with a "never mind, log out" escape hatch.
- A legacy admin account that predates required passwords gets a one-time
  self-serve password-set on login instead of being locked out; a legacy
  non-admin account still needs an admin to reset its password.
- Kicked users get their session killed immediately, even mid-action — any
  API call from a removed account destroys the session server-side and
  returns a 401, so the next poll drops them straight back to the login
  screen.

### The restaurant list
- Anyone can add a restaurant to the shared list at any time, not just during
  submissions, from a "+" button on either the Vote or Restaurants tab. It
  just needs a name and a menu link (a valid URL).
- Duplicate names (case-insensitive) are rejected with "that place is already
  in the vault."
- Submitting a pick for the current round means choosing from that list —
  each entry shows up as a pill on the Vote tab you tap to select, with a
  separate "menu" link segment on the same pill to preview it without
  picking it. There's no free-text entry in the round flow, so the group is
  always voting on a shared, de-duplicated set of options.
- Admins can edit or delete any entry from the Restaurants tab; deleting an
  entry only removes it from the shared list, it doesn't touch anyone's
  current pick or the hall of fame.

### Submission phase
- One pick per person, straight from the restaurant list. Picks are public
  as they land — a "Submitted so far" grid shows every pick with who
  submitted it. Change your pick or remove it entirely any time before
  voting starts.
- **Reactions** — react to any submitted pick with 🔥 😍 🤢 👀. No limit,
  mash the same emoji as many times as you want, just for fun. Counts update
  live for everyone.
- Don't want to submit anything? Hit **skip, no pick from me** — you'll still
  need to vote once voting opens, pick or no pick. Once you've skipped, that
  choice sticks (shown as "sitting this one out") until you tap "actually,
  let me pick something."
- Admins can edit the name/link on anyone's submitted pick, or delete it
  outright (deleting frees up that submitter to pick again); you can always
  edit or remove your own pick.
- Needs at least 2 submitted picks before an admin can start voting.

### Voting — pick your format
The admin chooses the format each round, right before voting opens:
- **Simple** — tap one favorite, most votes wins.
- **Points** — drag to rank everyone; 1st place scores N points (N =
  restaurant count), 2nd scores N-1, … down to 1.
- **Ranked choice (instant runoff)** — drag to rank everyone; if nobody has a
  majority, the lowest-ranked pick is eliminated and its votes shift to
  whoever's next on those ballots, repeating until someone clears a majority
  (or a full tie among everyone remaining is called as a tie).

Menu links stay visible on every voting screen, so nobody has to remember
what a restaurant serves from three screens ago. Ballots stay hidden from
everyone, including admins, until results are in — the "Ballots so far"
panel only shows a count, never the actual picks. Once you've voted you can
still re-open your ballot and re-submit before results drop.

### Results & reveal
- The admin triggers the reveal, or it happens automatically the moment
  everyone still in the round (minus anyone marked not coming) has voted.
- **Ranked-choice elections get a full instant-runoff playback**: each round
  plays out on screen with live vote-count bars, and the lowest pick is
  visibly eliminated before the next round's votes redistribute, all the way
  to the winning round (skippable). Once revealed, a permanent diagram of
  the whole runoff (every round, every elimination, one fixed color per
  restaurant that never changes across rounds) stays on the results screen
  for reference — it only appears when the runoff actually took more than
  one round.
- Simple and points elections get a suspenseful slot-machine name-spin
  before the reveal (also skippable); ranked-choice results that resolve in
  a single round get this spin too instead of the runoff playback.
- Either way: confetti, a crown, the winner's point/vote total, the final
  tally for every restaurant, and everyone's full ballots, visible to
  everyone once revealed.
- Ties are called out explicitly ("IT'S A TIE!") instead of picking a fake
  winner, and no entry gets logged to history for a tied round.
- The moment a round resolves with a clear (non-tied) winner, it's logged
  permanently to the hall of fame — see History below.

### History tab: hall of fame
Every round that resolves with a clear (non-tied) winner gets logged
forever: restaurant, who submitted it, the voting format used, the final
score, how many people voted, and the date. The History tab leads with two
scoreboard cards, **top restaurant** and **top picker** (by win count, with
runner-ups underneath), then the full chronological history below with
every past winner and an admin-only remove (×) per entry. Unlike round
state, this history is never touched by "reset everything," and an empty
history shows a "no winners crowned yet" placeholder instead of blank
scoreboards.

### Admin controls
Its own tab (Admin 👑, admin-only), grouped like a settings page:
- **Round** — start voting (choose the format — simple, points, or ranked
  choice — from a modal; disabled until 2+ picks exist), or force an early
  reveal during voting.
- **People** — create accounts (hands back a one-time temp password shown
  once in a modal), and a row per person with actions for that person: mark
  them not coming / count them back in, reset their password (also hands
  back a one-time temp password), or remove them from the round (not shown
  for your own row). Kicking everyone non-admin at once lives here too.
- **Danger zone** — reset everything: clears picks and votes and returns to
  the submission phase, but keeps accounts, the restaurant list, and the
  hall of fame untouched.

### Live roster
A status strip at the top of the Vote tab always shows who's in the round
and where they stand: "WHO'S IN (n/total)" during submissions, "WHO'S VOTED
(n/total)" during voting, each person a compact tile with a status dot and
plain-language status (`locked in a pick` / `voted`, `waiting`, `sitting
out`, `not coming`). Pure status display, no controls — those live in Admin.
Anyone marked not coming gets grouped into their own "NOT COMING" section
below the main roster instead of counting toward the total.

### Spectating
A **"not coming this round?"** link sits right in the submission and voting
panels on Vote, the place to mark yourself out. Toggle it on and you become
a pure spectator: no need to submit or vote, and you're pulled out of the
"everyone's in" / "everyone's voted" counts so you can't accidentally hold
up the round. You still see everything everyone else does — submitted picks
and results once they drop — just like an active participant, with no
elevated visibility into sealed ballots. The flag carries over between
rounds, set it once and it sticks until you (or an admin) flip it back, so
you don't have to re-flag yourself every time someone resets the board.
Admins can mark or un-mark anyone from the Admin tab's People list.

## Tech stack

- Next.js App Router + TypeScript
- Tailwind CSS v4 + Framer Motion (drag-to-rank, reveal animations) + canvas-confetti
- Cookie sessions via `iron-session`
- Storage: Redis (via `ioredis` + `REDIS_URL`) in production, a local
  `.data/state.json` file when `REDIS_URL` isn't set (dev only, Vercel's
  filesystem is ephemeral/read-only)
- Client state sync: SWR polling every screen on the same clock-aligned
  2.5s tick, so everyone's view updates in lockstep rather than drifting
  apart based on when each tab happened to load

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set `SESSION_SECRET` (a `.env.local`
with a generated one is already included for local dev, don't reuse it in
production). Without `REDIS_URL` set, data persists to `.data/state.json`
on disk, which is gitignored. Delete that file for a clean slate.

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel (or run `vercel` from
   this directory).
2. Add a Redis database: Vercel Dashboard → your project → **Storage** →
   **Create Database** → **Redis**, and connect it to this project. That
   auto-populates `REDIS_URL` for you, without it, votes won't persist
   between requests in production.
3. Set `SESSION_SECRET` in Project Settings → Environment Variables to a
   random 32+ character string (e.g. `openssl rand -hex 32`).
4. Optionally set `ADMIN_USERNAMES` to a comma-separated list of usernames
   that should always be admins (otherwise the first person to sign up gets
   the crown).
5. Deploy. Share the URL with your team.

## Notes

- Points scoring: for N restaurants, rank *i* (0-indexed, 0 = favorite) earns
  `N - i` points.
- Ranked choice: instant-runoff with ties on the lowest count eliminated
  together; a full tie among everyone remaining is reported as a tie rather
  than forced to a winner.
- The ranked-choice flow diagram uses a fixed, CVD-validated color per
  restaurant so identity stays traceable round to round (color never follows
  rank).
- Storage uses a simple read-modify-write on a single JSON blob, fine for a
  small team's lunch vote, not built for high-concurrency use.
- Old data shapes (e.g. restaurant-history entries from before entries had an
  `id` field) are migrated in place, automatically and idempotently, the
  first time they're read after an upgrade.
