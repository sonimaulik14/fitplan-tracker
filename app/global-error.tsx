"use client";

// Catches errors thrown in the root layout itself (which error.tsx cannot).
// Must render its own <html>/<body> since it replaces the whole document.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#07080c",
          color: "#f4f6fb",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#a8b1c2", marginTop: ".5rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.25rem",
              padding: ".625rem 1.25rem",
              borderRadius: ".75rem",
              border: "none",
              background: "#FF7A1F",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
