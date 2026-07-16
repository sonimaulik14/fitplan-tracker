import CoachPhoto from "./CoachPhoto";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 grid lg:grid-cols-2">
      {/* form side */}
      <div className="flex flex-col">
        {/* mobile-only photographic header (desktop gets the full panel at right) */}
        <div className="lg:hidden relative h-44 sm:h-52 overflow-hidden">
          <CoachPhoto className="absolute inset-0 w-full h-full object-cover object-top" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/10" />
          <div className="absolute inset-0 flex flex-col justify-end p-6">
            <span className="chip w-fit mb-2 !bg-black/55 !border-white/20 text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" /> 12-week
              program
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
              Train the plan.{" "}
              <span className="text-accent">Track the proof.</span>
            </h2>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
          {children}
        </div>
      </div>

      {/* hero side — full-bleed coach photo */}
      <div className="hidden lg:flex relative overflow-hidden border-l border-border">
        <CoachPhoto className="absolute inset-0 w-full h-full object-cover object-top" />
        {/* scrim for text legibility + ember heat (celebration surface) */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-background/20" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(40rem 40rem at 80% 10%, rgba(255,122,31,0.22), transparent 55%)",
          }}
        />
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16 max-w-xl">
          <span className="chip w-fit mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" /> 12-week
            program
          </span>
          <h2 className="font-display text-4xl xl:text-5xl font-bold leading-[1.05]">
            Train the plan.
            <br />
            <span className="text-accent">Track the proof.</span>
          </h2>
          <p className="text-muted mt-5 text-lg leading-relaxed">
            Log every set and rep against your plan, then see exactly how
            closely you followed it — adherence, rep quality, volume and PRs, all
            in one dashboard.
          </p>

          <div className="grid grid-cols-3 gap-3 mt-10">
            {[
              { k: "Adherence", v: "%", c: "var(--accent)" },
              { k: "Rep quality", v: "✓", c: "var(--success)" },
              { k: "Volume & PRs", v: "↑", c: "var(--steel)" },
            ].map((s) => (
              <div key={s.k} className="card p-4">
                <div
                  className="text-2xl font-display font-bold"
                  style={{ color: s.c }}
                >
                  {s.v}
                </div>
                <div className="text-xs text-muted mt-1">{s.k}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
