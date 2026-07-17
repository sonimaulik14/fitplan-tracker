import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Dumbbell, CalendarRange, Layers, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { clonePlanAction } from "@/lib/actions/plans";
import { focusIcon, termInfo } from "@/lib/ui";
import { MuscleGlyph } from "@/app/components/icons";

// Public, read-only view of a shared program. The unguessable token is the
// access control (see proxy.ts); anyone with the link can view and clone.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const plan = await prisma.plan.findUnique({
    where: { shareToken: token },
    select: { name: true },
  });
  return {
    title: plan ? `${plan.name} — shared program` : "Shared program",
    robots: { index: false, follow: false }, // unlisted, not for search engines
  };
}

export default async function SharedPlanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [plan, user] = await Promise.all([
    prisma.plan.findUnique({
      where: { shareToken: token },
      include: {
        owner: { select: { name: true } },
        weeks: {
          orderBy: { number: "asc" },
          include: {
            days: {
              orderBy: { orderIndex: "asc" },
              include: { exercises: { orderBy: { orderIndex: "asc" } } },
            },
          },
        },
      },
    }),
    getCurrentUser(),
  ]);
  if (!plan) notFound();

  const totalExercises = plan.weeks.reduce(
    (n, w) => n + w.days.reduce((m, d) => m + d.exercises.length, 0),
    0
  );
  const daysPerWeek = plan.weeks[0]
    ? plan.weeks[0].days.filter((d) => !d.focus.toLowerCase().includes("rest"))
        .length
    : 0;

  async function cloneHere() {
    "use server";
    const res = await clonePlanAction(token);
    if (res.ok) redirect("/plans");
    if (res.code === "auth") redirect(`/login?next=/p/${token}`);
    redirect(`/p/${token}`); // link revoked mid-visit → page will 404
  }

  const stats = [
    { Icon: CalendarRange, label: `${plan.weeks.length} weeks` },
    { Icon: Layers, label: `${daysPerWeek} days / week` },
    { Icon: Dumbbell, label: `${totalExercises} exercises` },
  ];

  return (
    <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-16">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-display font-black tracking-wide text-lg">
          VAJRA
        </Link>
        {!user && (
          <Link
            href={`/login?next=/p/${token}`}
            className="text-sm text-muted hover:text-foreground"
          >
            Sign in
          </Link>
        )}
      </div>

      <header className="mt-8 animate-fade-up">
        <p className="eyebrow">
          Shared program{plan.owner ? ` · by ${plan.owner.name}` : ""}
        </p>
        <h1 className="display-hero text-4xl sm:text-5xl mt-2">{plan.name}</h1>
        {plan.description && (
          <p className="text-muted mt-3 max-w-xl leading-relaxed">
            {plan.description}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          {stats.map((s) => (
            <span key={s.label} className="chip">
              <s.Icon size={13} className="text-accent" aria-hidden /> {s.label}
            </span>
          ))}
        </div>

        <form action={cloneHere} className="mt-6">
          <button type="submit" className="btn-primary inline-flex items-center gap-2">
            {user ? "Clone into my programs" : "Sign in & clone this program"}
            <ArrowRight size={16} aria-hidden />
          </button>
          <p className="text-xs text-muted mt-2">
            You get your own editable copy — logging stays private to you.
          </p>
        </form>
      </header>

      <section className="mt-10 space-y-4">
        {plan.weeks.map((w, wi) => {
          const styleInfo = w.style ? termInfo(w.style) : null;
          return (
            <details
              key={w.id}
              open={wi === 0}
              className="card p-0 overflow-hidden animate-fade-up"
            >
              <summary className="cursor-pointer list-none px-5 py-4 flex items-center gap-3">
                <span className="font-display font-bold">Week {w.number}</span>
                {w.style && <span className="chip text-accent">{w.style}</span>}
                <span className="ml-auto text-xs text-muted">
                  {w.days.filter((d) => !d.focus.toLowerCase().includes("rest")).length}{" "}
                  training days
                </span>
              </summary>
              {styleInfo && (
                <p className="px-5 pb-3 -mt-1 text-xs text-muted max-w-lg">
                  {styleInfo.desc}
                </p>
              )}
              <div className="border-t border-border divide-y divide-border">
                {w.days.map((d) => (
                  <div key={d.id} className="px-5 py-3">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <span aria-hidden>{focusIcon(d.focus)}</span> {d.focus}
                      <span className="text-xs text-muted font-normal">
                        · day {d.dayNumber}
                      </span>
                    </p>
                    {d.exercises.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {d.exercises.map((ex) => (
                          <li
                            key={ex.id}
                            className="text-sm text-muted flex items-center gap-2"
                          >
                            <MuscleGlyph muscle={ex.muscle} size={13} />
                            <span className="text-foreground/90">{ex.name}</span>
                            <span className="ml-auto stat-num text-xs shrink-0">
                              {ex.isCardio
                                ? ex.repTarget
                                : `${ex.workingSets} × ${ex.repTarget}`}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </section>

      <footer className="mt-10 text-center text-xs text-muted">
        Built with Vajra — log it, beat it, repeat it.
      </footer>
    </main>
  );
}
