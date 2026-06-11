import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getWorkoutHistory } from "@/lib/metrics";
import { fmtVolume, type Unit } from "@/lib/ui";
import NavBar from "@/app/components/NavBar";
import PhotoHero from "@/app/components/PhotoHero";
import { FocusGlyph } from "@/app/components/icons";

export const metadata = { title: "Workout history" };

const statusCls: Record<string, string> = {
  completed: "text-accent-2 border-accent-2/30 bg-accent-2/10",
  in_progress: "text-amber-300 border-amber-400/30 bg-amber-400/10",
};

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unit = user.unit as Unit;
  const history = await getWorkoutHistory(user.id);

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12">
        <PhotoHero
          queryKey="page:history"
          title="Workout history"
          subtitle={`${history.length} logged session${history.length === 1 ? "" : "s"}, newest first.`}
        />
        <Link
          href="/records"
          className="inline-flex items-center gap-1.5 text-sm text-accent font-semibold hover:underline"
        >
          🏆 View personal records →
        </Link>

        {history.length === 0 ? (
          <div className="card p-8 mt-6 text-center text-muted">
            No workouts logged yet — start one from the dashboard.
          </div>
        ) : (
          <div className="card divide-y divide-border overflow-hidden mt-6">
            {history.map((h) => (
              <Link
                key={h.id}
                href={`/workout/${h.dayId}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors"
              >
                <span className="grid place-items-center w-10 h-10 rounded-xl bg-surface-2 border border-border shrink-0">
                  <FocusGlyph focus={h.focus} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">
                    {h.focus}{" "}
                    {h.mood && <span className="font-normal">{h.mood}</span>}
                  </div>
                  <div className="text-xs text-muted">
                    {new Date(h.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · W{h.week} D{h.dayGlobal} · {h.doneSets} sets
                    {h.volume > 0 && <> · {fmtVolume(h.volume, unit)} {unit}</>}
                  </div>
                </div>
                <span
                  className={`chip border shrink-0 ${statusCls[h.status] ?? "text-muted border-border"}`}
                >
                  {h.status === "completed" ? "Done" : "In progress"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
