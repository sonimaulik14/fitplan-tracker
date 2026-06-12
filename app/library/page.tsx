import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getActivePlan } from "@/lib/metrics";
import { muscleStyle } from "@/lib/ui";
import NavBar from "@/app/components/NavBar";
import MusclePhoto from "@/app/components/MusclePhoto";
import { MuscleGlyph } from "@/app/components/icons";

export const metadata = { title: "Exercise library" };

const ORDER = ["Legs", "Chest", "Back", "Shoulders", "Arms", "Calves", "Abs"];

export default async function LibraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const plan = await getActivePlan();

  // Unique exercises by name → { muscle, count }
  const byName = new Map<string, { muscle: string; count: number }>();
  for (const w of plan?.weeks ?? [])
    for (const d of w.days)
      for (const ex of d.exercises) {
        if (ex.isCardio) continue;
        const cur = byName.get(ex.name);
        if (cur) cur.count += 1;
        else byName.set(ex.name, { muscle: ex.muscle, count: 1 });
      }

  const byMuscle = new Map<string, { name: string; count: number }[]>();
  for (const [name, { muscle, count }] of byName) {
    const arr = byMuscle.get(muscle) ?? [];
    arr.push({ name, count });
    byMuscle.set(muscle, arr);
  }
  const muscles = [...byMuscle.keys()].sort(
    (a, b) => (ORDER.indexOf(a) + 99) % 100 - ((ORDER.indexOf(b) + 99) % 100)
  );

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-3xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12">
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold">Exercise library</h1>
          <p className="text-muted mt-1">
            Every movement in your program — {byName.size} exercises across{" "}
            {muscles.length} muscle groups.
          </p>
        </div>

        <div className="space-y-8 mt-8">
          {muscles.map((m) => {
            const st = muscleStyle(m);
            const list = (byMuscle.get(m) ?? []).sort((a, b) =>
              a.name.localeCompare(b.name)
            );
            return (
              <section key={m}>
                <div className="flex items-center gap-3 mb-3">
                  <MusclePhoto
                    srcKey={st.key}
                    alt={m}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-xl object-cover border border-border duotone"
                  />
                  <div>
                    <h2 className="font-bold text-lg flex items-center gap-2">
                      <MuscleGlyph muscle={m} size={18} /> {m}
                    </h2>
                    <span className="text-xs text-muted">
                      {list.length} exercises
                    </span>
                  </div>
                </div>
                <div className="card divide-y divide-border overflow-hidden">
                  {list.map((ex) => (
                    <div
                      key={ex.name}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <Link
                        href={`/exercise/${encodeURIComponent(ex.name)}`}
                        className="min-w-0 flex-1 hover:text-accent transition-colors"
                      >
                        <span className="font-medium text-sm">{ex.name}</span>
                        <span className="block text-xs text-muted">
                          appears {ex.count}× · view history →
                        </span>
                      </Link>
                      <a
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                          "how to " + ex.name + " exercise"
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs font-semibold text-accent hover:underline"
                      >
                        ▶ How to
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
