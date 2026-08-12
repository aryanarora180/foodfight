# 🎰 Food Fight

A gamified, slot-machine-themed lunch picker for your team. Everyone submits one
restaurant, then the group ranks the field ranked-choice style (1st = N points,
down to 1), and the admin pulls the trigger to reveal a winner — confetti included.

## How it works

1. **Log in** — enter any username + password. First time you use a username, it
   creates your seat automatically (no separate signup flow).
2. **Submission phase** — everyone throws in one restaurant + a menu link. All
   picks are public as they come in.
3. **Voting phase** — the admin starts voting once there are at least 2 picks.
   Everyone drags to rank every restaurant. 1st place gets N points (N =
   number of restaurants), 2nd gets N-1, … down to 1 point. Live odds and every
   ballot are visible to everyone the whole time.
4. **Results** — the admin reveals the winner. Confetti, crown, final tally, and
   every ballot are shown.
5. **Admin** can reset the game at any point, which clears picks/votes and
   returns to the submission phase (accounts are kept).

The first person to ever log in becomes admin automatically. You can instead
pin specific admins via the `ADMIN_USERNAMES` env var (see below).

## Tech stack

- Next.js App Router + TypeScript
- Tailwind CSS v4 + Framer Motion (drag-to-rank, reveal animations) + canvas-confetti
- Cookie sessions via `iron-session`
- Storage: Upstash Redis in production, a local `.data/state.json` file when no
  Redis env vars are set (dev only — Vercel's filesystem is ephemeral/read-only)

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set `SESSION_SECRET` (a `.env.local`
with a generated one is already included for local dev — don't reuse it in
production). Without Redis env vars set, data persists to `.data/state.json`
on disk, which is gitignored.

## Deploying to Vercel

1. Push this repo to GitHub and import it into Vercel (or run `vercel` from
   this directory).
2. Add a Redis database: Vercel Dashboard → your project → **Storage** → add
   an **Upstash Redis** database from the Marketplace, and connect it to this
   project. That auto-populates `UPSTASH_REDIS_REST_URL` and
   `UPSTASH_REDIS_REST_TOKEN` for you — without these, votes won't persist
   between requests in production.
3. Set `SESSION_SECRET` in Project Settings → Environment Variables to a
   random 32+ character string (e.g. `openssl rand -hex 32`).
4. Optionally set `ADMIN_USERNAMES` to a comma-separated list of usernames
   that should always be admins (otherwise the first person to sign up gets
   the crown).
5. Deploy. Share the URL with your team.

## Notes

- Ranked-choice scoring: for N restaurants, rank *i* (0-indexed, 0 = favorite)
  earns `N - i` points. Ties are called out explicitly on the results screen.
- Storage uses a simple read-modify-write on a single JSON blob — fine for a
  small team's lunch vote, not built for high-concurrency use.
