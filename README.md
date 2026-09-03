# 🎰 Food Fight

A gamified, slot-machine-themed lunch picker for your team. Everyone submits one
restaurant, the group votes in whatever format the admin picks, and the house
reveals a winner — confetti and drama included.

## Features

### Accounts & auth
- Admin-created accounts only, with one bootstrap exception: the very first
  person to log in becomes admin automatically (or whoever's listed in
  `ADMIN_USERNAMES`, see below).
- Every account needs a real password. Admin-created accounts get a one-time
  temp password and are forced to set a real one on first login.
- Kicked users get their session killed immediately, even mid-action.

### Submission phase
- Everyone submits one restaurant + a menu link; picks are public as they
  land. You can update your pick, or **remove it entirely** and go back to
  square one, any time before voting starts.
- **The vault 🗄️** — every restaurant anyone has ever submitted is saved to a
  shared history. One click re-submits an old favorite instead of retyping it.
- **Reactions** — react to any pick with 🔥 😍 🤢 👀. No limit — mash the same
  emoji as many times as you want, just for fun. Counts update live for
  everyone.
- Don't want to submit anything? Hit **skip** — you'll still need to vote once
  voting opens.
- Admins can edit or remove *anyone's* pick; you can always edit or remove
  your own.

### Voting — pick your format
The admin chooses the format each round, right before voting opens:
- **Simple** — tap one favorite, most votes wins.
- **Points** — drag to rank everyone; 1st place scores N points (N =
  restaurant count), 2nd scores N-1, … down to 1.
- **Ranked choice (instant runoff)** — drag to rank everyone; if nobody has a
  majority, the lowest-ranked pick is eliminated and its votes shift to
  whoever's next on those ballots, repeating until someone clears a majority.

Menu links stay visible on every voting screen, so nobody has to remember
what a restaurant serves from three screens ago.

**Odds and ballots stay sealed for everyone — including admins — until the
reveal.** No peeking, no strategic voting.

### Results & reveal
- The admin triggers the reveal (or it happens automatically once everyone's
  voted).
- **Ranked-choice elections get a full instant-runoff playback**: each round
  plays out on screen with live vote-count bars, and the lowest pick is
  visibly eliminated before the next round's votes redistribute — all the way
  to the winning round.
- Simple and points elections get a suspenseful slot-machine name-spin before
  the reveal.
- Either way: confetti, a crown, the final tally, and every ballot, visible to
  everyone.
- Ties are called out explicitly instead of picking a fake winner.

### Admin controls
- Start voting (pick the format), or force an early reveal.
- Create accounts (hands back a one-time temp password) and reset anyone's
  password.
- Kick an individual user, or clear every non-admin seat at once — both ask
  for confirmation first.
- Edit or delete any submitted restaurant, or any vault/history entry.
- Reset everything — clears picks and votes and returns to the submission
  phase, but keeps accounts and vault history. Tucked away as a small,
  deliberately low-key control so it doesn't compete with the buttons you
  actually want to press.

### Live roster
A status strip always shows who's in the round and where they stand — each
person gets their own tile with a plainly-readable status (`voted ✓`,
`waiting …`, `sitting out 🤷`), no hovering required.

## Tech stack

- Next.js App Router + TypeScript
- Tailwind CSS v4 + Framer Motion (drag-to-rank, reveal animations) + canvas-confetti
- Cookie sessions via `iron-session`
- Storage: Redis (via `ioredis` + `REDIS_URL`) in production, a local
  `.data/state.json` file when `REDIS_URL` isn't set (dev only — Vercel's
  filesystem is ephemeral/read-only)

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set `SESSION_SECRET` (a `.env.local`
with a generated one is already included for local dev — don't reuse it in
production). Without `REDIS_URL` set, data persists to `.data/state.json`
on disk, which is gitignored.

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel (or run `vercel` from
   this directory).
2. Add a Redis database: Vercel Dashboard → your project → **Storage** →
   **Create Database** → **Redis**, and connect it to this project. That
   auto-populates `REDIS_URL` for you — without it, votes won't persist
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
- Storage uses a simple read-modify-write on a single JSON blob — fine for a
  small team's lunch vote, not built for high-concurrency use.
