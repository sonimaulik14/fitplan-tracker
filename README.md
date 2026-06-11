# FitPlan — 12-Week Transformation Tracker

A modern, photo-rich web app for running a 12-week bodybuilding program (Kris
Gethin–style): log every set and rep, follow a guided in-gym flow, and track
adherence, PRs, volume, streaks and your body over the whole block.

Built with the Next.js App Router, Prisma + SQLite, and a custom design system.

## Features

- **The full 12-week plan** — all 84 days seeded across rotating protocols
  (YT3, Y3T, FST-7, GVT, HIT, DTP Extreme) with supersets, giant sets and rep
  ladders, plus a tap-to-explain training-term glossary.
- **Frictionless logging** — auto-save, `100x10` quick-log, copy-from-previous,
  per-exercise demo clips, swap/substitution, RPE.
- **Guided Focus mode** — full-screen, set-by-set in-gym flow that interleaves
  supersets/giant sets round-by-round.
- **This week's targets** — suggested weights for every lift from last time +
  rep targets (progressive overload).
- **Analysis** — adherence rings, weekly trend, per-style breakdown, volume
  landmarks (MEV→MRV), PRs, per-muscle volume.
- **Progress** — streak heatmap, achievements, bodyweight chart, progress
  photos, body measurements & goals, and a **12-Week Wrapped** story recap.
- **Nutrition** — calories/macros, water, supplement checklist.
- **Polish** — live Pexels/Unsplash photography, light/dark themes, command
  palette (⌘K), PWA, page transitions and loading skeletons.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
Prisma 6 + SQLite · custom JWT cookie auth (`jose` + `bcryptjs`) ·
Framer Motion · next/og.

## Getting started

```bash
npm install
cp .env.example .env        # then fill in AUTH_SECRET (openssl rand -hex 32)
npx prisma db push          # create the SQLite schema
npm run seed                # load the 12-week plan
npm run dev                 # http://localhost:3000
```

Optional API keys (in `.env`) unlock live gym photography
(`PEXELS_API_KEY` or `UNSPLASH_ACCESS_KEY`) and per-exercise demo clips
(`EXERCISEDB_API_KEY`). The app works without them via local fallbacks.

## Notes

- `prisma/dev.db` and `.env` are git-ignored — the database is created locally
  by `prisma db push` + `npm run seed`.
- Weights are stored canonically in kg and converted to the user's unit (kg/lb)
  at the UI boundary.
