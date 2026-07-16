# Vajra — 12-Week Muscle-Building Program Tracker

Vajra is a focused tracker for running a structured 12-week bodybuilding
program: press start, log every set and rep through a guided in-gym flow, and
track adherence, PRs, volume, streaks and your body over the whole block —
then start the next cycle with your history intact.

**▶ Live:** <https://fitplan-tracker-seven.vercel.app>

Built with the Next.js App Router, React 19, Prisma + PostgreSQL, and the
FORGE design system (iron, chalk, and ember — matte panels, one molten
accent, mono digits for everything that ticks).

## Features

- **The program** — a 12-week muscle builder, all 84 days seeded across
  rotating protocols (Y3T, FST-7, GVT, HIT, DTP) with twice-daily cardio.
  Schedule a start date, follow the day-by-day timeline, and when the block
  ends, **start the next cycle** — your logs, PRs and streaks carry over.
- **Frictionless logging** — auto-save, `100x10` quick-log, copy-from-previous,
  a rest timer docked to the bottom edge that auto-starts when you finish a
  set, "last time" reference + progressive-overload suggestions, RPE,
  supersets/giant sets, and a tap-to-explain training-term glossary.
- **Built for the gym floor** — the screen stays awake during a session
  (wake-lock), and logging is **offline-first**: every save lands in an
  on-device outbox before the network, so a dead spot in the weight room
  never loses a set. Queued workouts sync automatically when reception
  returns.
- **Equipment-aware swaps** — substitute any exercise from a curated list
  filtered to the gear you have (hotel gym, home gym, CrossFit box).
- **Analysis** — adherence rings, weekly trend, per-style breakdown, volume
  landmarks (MEV→MRV), PRs, per-muscle volume.
- **Progress** — streak heatmap, achievements, bodyweight chart, progress
  photos with a before/after slider, measurements & goals, and a **Wrapped**
  story recap + completion certificate.
- **Nutrition** — calories/macros, water, per-workout-day supplement
  checklist with cycle-scoped intake totals.
- **Reminders** — opt-in web-push workout reminders on your training days,
  timezone-aware (works on iOS once added to the Home Screen).
- **Accounts** — sign up / sign in, 90-day "keep me signed in", password
  reset with session revocation, rate-limited auth (fail-closed when Redis
  is down), and auth-by-default request gating via Next 16's `proxy.ts`.
- **PWA** — installable, offline fallback, build-stamped service-worker
  caching, light/dark themes, command palette (⌘K) on desktop.

## Tech stack

Next.js 16 (App Router, `proxy.ts`) · React 19 · TypeScript · Tailwind CSS v4 ·
Prisma 6 + PostgreSQL · custom JWT cookie auth (`jose` + `bcryptjs`) ·
IndexedDB offline outbox · `web-push` (reminders) · `motion` · Vitest ·
deployed on **Vercel** + **Neon**.

## Getting started (local)

Requires a PostgreSQL database — easiest is `npx prisma dev` (local) or a free
[Neon](https://neon.tech) branch.

```bash
npm install
cp .env.example .env     # set DATABASE_URL (pooled), DIRECT_URL (direct),
                         # and AUTH_SECRET (openssl rand -hex 32)
npm run db:deploy        # apply migrations to your database
npm run db:seed          # load the program (idempotent — never touches logs)
npm run dev              # http://localhost:3000
```

`npm run db:seed` also creates a demo login: **demo@vajra.fit / demo123**.

Optional keys (in `.env`, each enabling one feature — the app degrades
gracefully without them):

- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` /
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `CRON_SECRET` — **push reminders**
  (`npx web-push generate-vapid-keys`). The reminder cron is driven by
  `.github/workflows/reminders.yml` (every 15 minutes).
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — shared rate
  limiting across serverless instances.
- `PEXELS_API_KEY` or `UNSPLASH_ACCESS_KEY` — live photography on marketing
  surfaces; `EXERCISEDB_API_KEY` — per-exercise demo clips.
- `RESEND_API_KEY` — password-reset emails.

## Deployment

See **[DEPLOY.md](DEPLOY.md)** for the full Vercel + Neon runbook. In short:
push to `main` → Vercel auto-builds and deploys; run `npm run db:deploy`
against the database only when you change the Prisma schema.

## Testing

`npm test` runs the Vitest suite: pure domain logic (units, rep parsing, 1RM,
streaks), the offline outbox (coalescing, drain classification, backoff),
session verification + revocation, rate-limiter fail-closed behavior,
reminder timezone gating, and the workout-save/next-cycle actions against a
mocked Prisma layer.

## Notes

- `.env` is git-ignored — never commit your secrets.
- Weights are stored canonically in kg and converted to the user's unit
  (kg/lb) at the UI boundary.
- The seed is idempotent and non-destructive: re-running it updates the
  program in place and never deletes anything a user has logged against.
