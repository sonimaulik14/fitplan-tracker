# FitPlan — Muscle-Building Program Tracker

A modern, photo-rich web app for running a structured bodybuilding program:
pick a plan, log every set and rep through a guided in-gym flow, and track
adherence, PRs, volume, streaks and your body over the whole block.

**▶ Live:** <https://fitplan-tracker-seven.vercel.app>

Built with the Next.js App Router, React 19, Prisma + PostgreSQL, and a custom
design system.

## Features

- **Programs** — choose a program (e.g. the 12-Week Muscle Builder, all 84 days
  seeded across rotating protocols — YT3, Y3T, FST-7, GVT, HIT, DTP) and switch
  between programs anytime without losing progress.
- **Frictionless logging** — auto-save, `100x10` quick-log, copy-from-previous,
  a **rest timer** that auto-starts when you finish a set, "last time" reference
  + progressive-overload suggestions, RPE, supersets/giant sets, and a
  tap-to-explain training-term glossary.
- **Equipment-aware swaps** — substitute any exercise from a curated list
  filtered to the gear you have (perfect for a hotel/home gym).
- **AI Coach** — chat with a coach (Claude) that reads your real logged history
  — program, current week, adherence, per-muscle volume, PRs and stalled lifts —
  for deload / rep-range / swap advice, plus an at-a-glance plateau watch on the
  dashboard.
- **Analysis** — a plain-language highlights band, adherence rings, weekly
  trend, per-style breakdown, volume landmarks (MEV→MRV), PRs, per-muscle volume.
- **Progress** — streak heatmap, achievements, bodyweight chart, progress photos
  with a **before/after slider**, body measurements & goals, and a **Wrapped**
  story recap.
- **Nutrition** — calories/macros, water, supplement checklist.
- **Reminders** — opt-in web-push workout reminders on your training days
  (works on iOS once added to the Home Screen).
- **Resets** — clear a single day or restart the whole program (keeps your body
  metrics, nutrition and photos).
- **Accounts** — sign up / sign in, "keep me signed in", password reset with
  session revocation, and rate-limited auth.
- **Polish** — live Pexels/Unsplash photography, light/dark themes, command
  palette (⌘K), PWA, smooth page transitions, and `next/image` optimization.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Prisma 6 + PostgreSQL · custom JWT cookie auth (`jose` + `bcryptjs`) ·
Anthropic SDK (AI coach) · `web-push` (reminders) · `motion` · `next/image` ·
Vitest · deployed on **Vercel** + **Neon**.

## Getting started (local)

Requires a PostgreSQL database — the easiest is a free [Neon](https://neon.tech)
branch.

```bash
npm install
cp .env.example .env     # set DATABASE_URL (pooled), DIRECT_URL (direct),
                         # and AUTH_SECRET (openssl rand -hex 32)
npm run db:deploy        # apply migrations to your database
npm run db:seed          # load the training programs
npm run dev              # http://localhost:3000
```

`npm run db:seed` also creates a demo login: **demo@fitplan.com / demo123**.

Optional keys (in `.env`, each enabling one feature — the app degrades
gracefully without them):

- `ANTHROPIC_API_KEY` — the **AI Coach** (defaults to `claude-sonnet-4-6`;
  override with `ANTHROPIC_MODEL`).
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` /
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `CRON_SECRET` — **push reminders**
  (`npx web-push generate-vapid-keys`).
- `PEXELS_API_KEY` or `UNSPLASH_ACCESS_KEY` — live gym photography;
  `EXERCISEDB_API_KEY` — per-exercise demo clips.

## Deployment

See **[DEPLOY.md](DEPLOY.md)** for the full Vercel + Neon runbook. In short:
push to `main` → Vercel auto-builds and deploys; run `npm run db:deploy` against
the database only when you change the Prisma schema.

## Testing

`npm test` runs the Vitest unit suite (pure domain logic — unit conversion,
rep-range parsing, exercise alternatives, 1RM estimation).

## Notes

- `.env` is git-ignored — never commit your secrets.
- Weights are stored canonically in kg and converted to the user's unit (kg/lb)
  at the UI boundary.
- Drop a `public/kris/coach.jpg` to set the login/auth hero photo (falls back to
  a gym shot otherwise).
