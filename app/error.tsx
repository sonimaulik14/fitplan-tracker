"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex-1 grid place-items-center p-6 text-center">
      <div className="animate-fade-up">
        <div className="text-5xl">💥</div>
        <h1 className="text-2xl font-bold mt-4">Something went wrong</h1>
        <p className="text-muted mt-2 max-w-sm mx-auto">
          An unexpected error occurred. Try again — your data is safe.
        </p>
        <button onClick={reset} className="btn-primary mt-6">
          Try again
        </button>
      </div>
    </main>
  );
}
