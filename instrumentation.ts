// Runs once at server startup (Next.js instrumentation hook). Fails fast in
// production if a truly-required env var is missing, and logs which optional
// features are enabled so a misconfigured deploy is obvious from the boot logs.
export function register() {
  const REQUIRED = ["DATABASE_URL", "AUTH_SECRET"];
  const missing = REQUIRED.filter((k) => !process.env[k]);

  if (missing.length) {
    const msg = `[env] missing required: ${missing.join(", ")}`;
    if (process.env.NODE_ENV === "production") throw new Error(msg);
    console.warn(`${msg} (non-production — using insecure defaults)`);
  }

  const features = {
    "AI Coach": !!process.env.ANTHROPIC_API_KEY,
    "Push reminders":
      !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY,
    "Reminder cron": !!process.env.CRON_SECRET,
    Photos: !!process.env.PEXELS_API_KEY || !!process.env.UNSPLASH_ACCESS_KEY,
    "Exercise demos": !!process.env.EXERCISEDB_API_KEY,
  };
  console.log(
    "[env] optional features:",
    Object.entries(features)
      .map(([k, on]) => `${k}=${on ? "on" : "off"}`)
      .join(", ")
  );
}
