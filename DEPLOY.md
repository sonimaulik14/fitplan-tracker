# Deploying Vajra (Vercel + Neon Postgres)

The app now uses **PostgreSQL** (it was SQLite — that doesn't survive on serverless
hosts). Local dev and production both run Postgres.

## 1. Create the database (Neon)

1. Sign up at <https://neon.tech> → create a project (pick a region near you).
2. From the dashboard, copy **two** connection strings:
   - **Pooled** (host contains `-pooler`) → this is `DATABASE_URL`
   - **Direct** (host without `-pooler`) → this is `DIRECT_URL`
   Both should end with `?sslmode=require`.

## 2. Generate an auth secret

```bash
openssl rand -hex 32
```
Save the output — it's `AUTH_SECRET`. (Production refuses to start without it.)

## 3. Apply the schema + seed (one time)

Point your local `.env` at Neon (copy `.env.example` → `.env`, fill in the three
values above), then:

```bash
npm install
npm run db:deploy   # prisma migrate deploy — creates all tables on Neon
npm run db:seed     # loads the training plan(s)
```

## 4. Deploy to Vercel

1. Push the repo to GitHub (already your `sonimaulik14/fitplan-tracker`).
2. At <https://vercel.com> → **Add New → Project** → import the repo.
3. Add **Environment Variables** (Production + Preview):
   - `DATABASE_URL`  (pooled)
   - `DIRECT_URL`    (direct)
   - `AUTH_SECRET`
   - *(optional)* `PEXELS_API_KEY` or `UNSPLASH_ACCESS_KEY` for live gym photos
   - *(for push + crons)* `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
     `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (same value as the public key),
     `VAPID_SUBJECT` (e.g. `mailto:you@example.com`), and `CRON_SECRET`
     (`openssl rand -hex 32`) — Vercel Cron automatically sends
     `Authorization: Bearer $CRON_SECRET` to the cron routes.
4. **Deploy.** Vercel runs `npm install` (→ `prisma generate`), then the build
   command from [vercel.json](vercel.json):
   `prisma migrate deploy && prisma generate && next build` — pending migrations
   are applied to Neon automatically on every deploy, so code and schema can't
   drift apart.
5. Add your **custom domain** under Project → Settings → Domains.
6. **Crons** come from [vercel.json](vercel.json): daily workout reminders
   (`/api/cron/reminders`, hourly — per-user local-time gating + daily dedupe
   live in the route) and the Monday week-in-review digest (`/api/cron/weekly`,
   daily at 03:30 UTC — sends once per user per week inside their local
   Mon–Wed ≥ 08:00 window). Note: the **Hobby plan limits cron frequency to
   daily** — on Hobby, change the reminders schedule to a fixed daily time
   (e.g. `30 12 * * *` ≈ 18:00 IST) or trigger it from an external scheduler
   with the same bearer header.

## 5. Post-deploy checks

- Sign up a real account → onboarding → pick a plan → log a workout.
- Confirm the cookie is `Secure` (it auto-enables in production).

---

## Local development (now Postgres)

You no longer use `prisma/dev.db`. Use a Postgres for local dev — easiest options:

- **Neon dev branch** (zero install): create a branch in Neon, put its URLs in `.env`.
- **Local Postgres**: install Postgres.app or `brew install postgresql@16`, create a
  db, set `DATABASE_URL`/`DIRECT_URL` to `postgresql://localhost:5432/fitplan`.

Then:
```bash
npm run db:deploy && npm run db:seed && npm run dev
```

## Production notes / known gaps

- **Rate limiter** ([lib/rate-limit.ts](lib/rate-limit.ts)) is in-memory: it works on a
  single instance but won't share state across serverless instances. For real scale,
  back it with **Upstash Redis**.
- **Password reset** returns the link inline (no email sent). Wire **Resend** (or any
  SMTP/email API) to actually email the reset link before relying on it.
- **Photos** (avatars, progress photos) are stored as data URLs in Postgres `TEXT`.
  Fine for low volume; move to object storage (S3/R2/Vercel Blob) if it grows.
- **Demo credentials** on the login form are hidden in production, and the seed does
  not create a demo user — so prod has no shared/known account.
- Set `prisma generate` caching aside; Vercel's `postinstall` handles it.
