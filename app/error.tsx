"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  // Error boundaries only render on the client, so navigator is safe to read.
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <main className="flex-1 grid place-items-center p-6 text-center">
      <div className="animate-fade-up">
        <div className="text-5xl">{offline ? "📡" : "💥"}</div>
        <h1 className="text-2xl font-bold mt-4">Something went wrong</h1>
        <p className="text-muted mt-2 max-w-sm mx-auto">
          {offline
            ? "You're offline — your logged sets are safe on this device; reconnect and retry."
            : "An unexpected error occurred. Try again — your data is safe."}
        </p>
        <button onClick={reset} className="btn-primary mt-6">
          {offline ? "Retry" : "Try again"}
        </button>
      </div>
    </main>
  );
}
