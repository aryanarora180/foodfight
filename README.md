# 🎰 Food Fight

A gamified, slot-machine-themed lunch picker for your team. Everyone picks a
restaurant from the shared list, the group votes in whatever format the admin
chooses, and the house reveals a winner. Confetti and drama included.

## Navigation

A full-width banner sits across the top of every screen with the brand and
your account info. Below it, navigation splits by screen size, the same way
a Mac app's sidebar collapses to an iPhone tab bar:
- **Vote** 🎰 — the live round: roster, and whichever phase is active (pick /
  vote / results). This is home base.
- **Restaurants** 🍽️ — stats, the hall of fame, and the full restaurant list
  with an "add a restaurant" button. Not for gameplay. To actually submit or
  change your pick for the *current* round, that stays on Vote.
- **Admin** 👑 — admin-only. Round controls, account management, and the
  reset button, out of everyone else's way.

## Features

### Accounts & auth
- Admin-created accounts only, with one bootstrap exception: the very first
  person to log in becomes admin automatically (or whoever's listed in
  `ADMIN_USERNAMES`, see below).
- Every account needs a real password. Admin-created accounts get a one-time
  temp password and are forced to set a real one on first login.
- Kicked users get their session killed immediately, even mid-action.

### The restaurant list
- Anyone can add a restaurant to the shared list at any time, not just during
  submissions. It just needs a name and a menu link.
- Submitting a pick for the current round means choosing from that list.
  There's no free-text entry in the round flow, so the group is always voting
  on a shared, de-duplicated set of options.
- Admins can edit or delete any entry from the Restaurants tab.

### Submission phase
- Pick one restaurant from the list; picks are public as they land. Change
  your pick or remove it entirely any time before voting starts.
- **Reactions** — react to any pick with 🔥 😍 🤢 👀. No limit, mash the same
  emoji as many times as you want, just for fun. Counts update live for
  everyone.
- Don't want to submit anything? Hit **skip**, you'll still need to vote once
  voting opens.
- Admins can edit the name/link on anyone's submitted pick, or delete it
  outright; you can always edit or remove your own.

### Voting — pick your format
The admin chooses the format each round, right before voting opens:
- **Simple** — tap one favorite, most votes wins.
- **Points** — drag to rank everyone; 1st place scores N points (N =
  restaurant count), 2nd scores N-1, … down to 1.
- **Ranked choice (instant runoff)** — drag to rank everyone; if nobody has a
  majority, the lowest-ranked pick is eliminated and its votes shift to
  whoever's next on those ballots, repeating until someone clears a majority.

Menu links stay visible on every voting screen, so nobody has to remember
what a restaurant serves from three screens ago. Ballots stay hidden from
everyone, including admins, until results are in.

### Results & reveal
- The admin triggers the reveal, or it happens automatically once everyone's
  voted.
- **Ranked-choice elections get a full instant-runoff playback**: each round
  plays out on screen with live vote-count bars, and the lowest pick is
  visibly eliminated before the next round's votes redistribute, all the way
  to the winning round. Once revealed, a permanent diagram of the whole
  runoff (every round, every elimination, color-coded per restaurant) stays
  on the results screen for reference.
- Simple and points elections get a suspenseful slot-machine name-spin before
  the reveal.
- Either way: confetti, a crown, the final tally, and every ballot, visible to
  everyone.
- Ties are called out explicitly instead of picking a fake winner.
- The moment a round resolves with a clear winner, it's logged permanently.
  See the hall of fame below.

### Restaurants tab: stats & the hall of fame
Every round that resolves with a clear (non-tied) winner gets logged forever:
restaurant, who submitted it, the voting format, the score, and the date.
The Restaurants tab leads with that in big scoreboard-style type, top
restaurant and top picker, plus the full win history below it, and the
complete restaurant list with the add button under that. Admins can remove a
bad hall of fame entry; nothing else can touch it. Unlike round state, this
history is never cleared by "reset everything."

### Admin controls
Its own tab (Admin 👑, admin-only), grouped like a settings page:
- **Round** — start voting (pick the format), or force an early reveal.
- **People** — create accounts (hands back a one-time temp password), and a
  row per person with actions for that person: mark them not coming, reset
  their password, or remove them from the round. Kicking everyone at once
  lives here too.
- **Danger zone** — reset everything: clears picks and votes and returns to
  the submission phase, but keeps accounts, the restaurant list, and the hall
  of fame.

### Live roster
A status strip on the Vote tab always shows who's in the round and where
they stand, each person gets their own compact tile with a status dot and
plain-language status (`voted`, `waiting`, `sitting out`, `not coming`). Pure
status display, no controls, those live in Admin.

### Spectating
A **"not coming this round?"** link sits right in the submission and voting
panels on Vote, the place to mark yourself out. Toggle it on and you become a
pure spectator: no need to submit or vote, and you're pulled out of the
"everyone's in" / "everyone's voted" counts so you can't accidentally hold up
the round. You still see everything everyone else does, submitted picks and
results once they drop, just like an active participant, with no elevated
visibility into sealed ballots. Not-coming users get their own section in the
roster, separate from everyone still in the round. The flag carries over
between rounds, set it once and it sticks until you (or an admin) flip it
back, so you don't have to re-flag yourself every time someone resets the
board. Admins can mark or un-mark anyone from the Admin tab's people list.

## Tech stack

- Next.js App Router + TypeScript
- Tailwind CSS v4 + Framer Motion (drag-to-rank, reveal animations) + canvas-confetti
- Cookie sessions via `iron-session`
- Storage: Redis (via `ioredis` + `REDIS_URL`) in production, a local
  `.data/state.json` file when `REDIS_URL` isn't set (dev only, Vercel's
  filesystem is ephemeral/read-only)

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set `SESSION_SECRET` (a `.env.local`
with a generated one is already included for local dev, don't reuse it in
production). Without `REDIS_URL` set, data persists to `.data/state.json`
on disk, which is gitignored.

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
