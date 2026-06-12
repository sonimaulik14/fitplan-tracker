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
  filtered to the gear you have, or **adapt the whole workout** to your
  equipment in one tap (perfect for a hotel/home gym).
- **Guided Focus mode** — full-screen, set-by-set flow that interleaves
  supersets/giant sets round-by-round.
- **Coach** — surfaces stalled lifts and suggests deload / rep-range / swap
  options to break plateaus.
- **Analysis** — a plain-language highlights band, adherence rings, weekly
  trend, per-style breakdown, volume landmarks (MEV→MRV), PRs, per-muscle volume.
- **Progress** — streak heatmap, achievements, bodyweight chart, progress photos
  with a **before/after slider**, body measurements & goals, and a **Wrapped**
  story recap.
- **Nutrition** — calories/macros, water, supplement checklist.
- **Resets** — clear a single day or restart the whole program (keeps your body
  metrics, nutrition and photos).
- **Accounts** — sign up / sign in, "keep me signed in", password reset with
  session revocation, and rate-limited auth.
- **Polish** — live Pexels/Unsplash photography, light/dark themes, command
  palette (⌘K), PWA, smooth page transitions, and `next/image` optimization.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Prisma 6 + PostgreSQL · custom JWT cookie auth (`jose` + `bcryptjs`) ·
Framer Motion · `next/image` · deployed on **Vercel** + **Neon**.

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

Optional API keys (in `.env`) unlock live gym photography
(`PEXELS_API_KEY` or `UNSPLASH_ACCESS_KEY`) and per-exercise demo clips
(`EXERCISEDB_API_KEY`). The app works without them via local fallbacks.

## Deployment

See **[DEPLOY.md](DEPLOY.md)** for the full Vercel + Neon runbook. In short:
push to `main` → Vercel auto-builds and deploys; run `npm run db:deploy` against
the database only when you change the Prisma schema.

## Notes

- `.env` is git-ignored — never commit your secrets.
- Weights are stored canonically in kg and converted to the user's unit (kg/lb)
  at the UI boundary.
- Drop a `public/kris/coach.jpg` to set the login/auth hero photo (falls back to
  a gym shot otherwise).
