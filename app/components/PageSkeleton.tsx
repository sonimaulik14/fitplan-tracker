function Bar({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

// Faux top bar matching the real NavBar (flat, opaque, mobile-slim).
function FauxNav() {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-5 h-14 sm:h-16 flex items-center justify-between">
        <Bar className="w-28 h-8" />
        <Bar className="hidden md:block w-80 h-9 rounded-lg" />
        <Bar className="w-9 h-9 rounded-full" />
      </div>
    </div>
  );
}

// A lightweight stand-in shown while a route's data loads. Mirrors the real
// layout: flat nav + page-specific body.
export default function PageSkeleton({
  variant = "default",
}: {
  variant?: "default" | "dashboard" | "list" | "stats";
}) {
  const wide = variant === "dashboard";
  return (
    <>
      <FauxNav />
      <main
        className={`flex-1 ${wide ? "max-w-5xl" : "max-w-3xl"} w-full mx-auto px-5 py-8 space-y-6`}
      >
        {/* hero banner (every page now opens with one) */}
        <Bar className="w-full h-44 sm:h-56 rounded-2xl" />

        {variant === "dashboard" && (
          <>
            <Bar className="w-full h-40 rounded-2xl" />
            <div className="grid sm:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Bar key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          </>
        )}

        {variant === "list" && (
          <div className="space-y-2.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <Bar key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        )}

        {variant === "stats" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Bar key={i} className="h-44 rounded-2xl" />
              ))}
            </div>
            <Bar className="w-full h-52 rounded-2xl" />
            <Bar className="w-full h-44 rounded-2xl" />
          </>
        )}

        {variant === "default" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Bar key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <Bar className="w-full h-48 rounded-2xl" />
            <Bar className="w-full h-48 rounded-2xl" />
          </>
        )}
      </main>
    </>
  );
}
