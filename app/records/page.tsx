import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getProgress, est1RM } from "@/lib/metrics";
import { fmtWeight, muscleStyle, type Unit } from "@/lib/ui";
import NavBar from "@/app/components/NavBar";
import PhotoHero from "@/app/components/PhotoHero";
import { MuscleGlyph } from "@/app/components/icons";

export const metadata = { title: "Personal records" };

export default async function RecordsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unit = user.unit as Unit;
  const p = await getProgress(user.id);
  const prs = p?.prs ?? [];

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12">
        <PhotoHero
          queryKey="page:records"
          title="Personal records"
          subtitle="Your heaviest lift on every exercise."
        />
        <Link
          href="/history"
          className="inline-flex items-center gap-1.5 text-sm text-accent font-semibold hover:underline"
        >
          🗓️ View workout history →
        </Link>

        {prs.length === 0 ? (
          <div className="card p-8 mt-6 text-center text-muted">
            Log weight × reps on your working sets to start setting records.
          </div>
        ) : (
          <div className="space-y-2 mt-6">
            {prs.map((pr, i) => {
              const st = muscleStyle(pr.muscle);
              return (
                <Link
                  key={pr.name}
                  href={`/exercise/${encodeURIComponent(pr.name)}`}
                  className="card card-hover p-4 flex items-center gap-3"
                >
                  <span className="w-7 text-center font-display font-bold text-muted">
                    {i + 1}
                  </span>
                  <span
                    className="w-1.5 h-9 rounded-full shrink-0"
                    style={{ background: st.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm truncate flex items-center gap-1.5">
                      <MuscleGlyph muscle={pr.muscle} size={15} /> {pr.name}
                    </div>
                    <div className="text-xs text-muted">
                      est. 1RM {fmtWeight(est1RM(pr.maxWeight, pr.repsAtMax), unit)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold num-gradient text-lg">
                      {fmtWeight(pr.maxWeight, unit)}
                    </div>
                    <div className="text-xs text-muted">× {pr.repsAtMax}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
