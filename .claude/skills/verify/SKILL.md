---
name: verify
description: Build, run, and drive Vajra (Next.js 16 + Prisma/Postgres PWA) to verify changes end-to-end at the HTTP surface.
---

# Verifying Vajra changes

## Environment

- Local DB is a `prisma dev` Postgres on `localhost:51214` (see `.env`). It must
  be up before anything DB-touching. It has a tiny connection cap.
- `npm run db:deploy` applies migrations (never `migrate dev`); `npx prisma generate`
  after schema changes.
- **After a schema change, restart any running `next dev`** — the old process
  holds the pre-migration Prisma client in memory and every `getCurrentUser()`
  starts throwing `Unknown field` validation errors.
- **Production build**: 9 prerender workers × `connection_limit=10` overwhelm the
  local DB (`P1001` mid-build). Build with the limit dropped to 1:

  ```bash
  URL=$(grep '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"' | sed 's/connection_limit=10/connection_limit=1/')
  DURL=$(grep '^DIRECT_URL=' .env | cut -d= -f2- | tr -d '"' | sed 's/connection_limit=10/connection_limit=1/')
  DATABASE_URL="$URL" DIRECT_URL="$DURL" npx next build
  ```

- Only ONE `next dev` per project dir (Next 16 refuses a second). If one is
  already running (usually port 3000), drive that one.

## Getting an authenticated handle (no browser needed)

Auth is a custom HS256 JWT in the `fitplan_session` cookie (`lib/session.ts`,
payload `{ uid, tv }`, secret `AUTH_SECRET`). Mint one directly:

1. Write a `tsx` script **inside the repo root** (module resolution fails from
   /tmp) that creates a user + enrollment + history with Prisma, then signs
   `new SignJWT({ uid, tv: 0 })` with jose. Run it with env sourced:
   `set -a && source .env && set +a && npx tsx .fixture.tmp.ts`
2. `curl -b "fitplan_session=<jwt>" http://localhost:3000/<page>` — RSC pages
   (and client components' initial SSR) render fully into the HTML, so grepping
   the response verifies UI state. Flight payload duplicates strings (expect ×2
   counts).

Gotchas for fixtures:
- Exercise names vary week-to-week in the seeded plan; "last time"/plateau
  metrics key by NAME. Pick names that recur (query `planExercise` by name).
- One `WorkoutSession` per (enrollment, workoutDay); one active enrollment per
  user is the app invariant — a second active one hijacks dashboard/targets.
- `getLastTimeByExercise` excludes the day being viewed — history must live on
  OTHER WorkoutDays.

## Driving server actions without a browser

Forms in RSCs support no-JS progressive enhancement. To submit one via curl:
fetch the page, extract ALL hidden `$ACTION_*` inputs from the `<form>` —
**including the valueless `$ACTION_REF_n`** (omitting it → 500 "Failed to find
Server Action") — and POST them back as multipart to the same URL with the
session cookie. A successful action that `redirect()`s returns 303.

## Cron routes

`curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/<name>`
(secret in `.env`). No/wrong bearer must give 401.

## Cleanup

Delete the fixture user (`prisma.user.deleteMany({ where: { email } })`) —
enrollments, sessions, sets, and owned plans all cascade. Remove `.tmp.ts`
scripts from the repo root.
