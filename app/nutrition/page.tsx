import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getNutritionToday } from "@/lib/metrics";
import NavBar from "@/app/components/NavBar";
import PhotoHero from "@/app/components/PhotoHero";
import { AnimatedRing } from "@/app/components/motion";
import {
  FoodLog,
  WaterTracker,
  SupplementChecklist,
  NutritionGoals,
} from "@/app/components/NutritionClient";

export const metadata = { title: "Nutrition" };

export default async function NutritionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const n = await getNutritionToday(user.id);

  const cal = Math.round(n.totals.calories);
  const calPct = n.calorieGoal
    ? Math.min(100, Math.round((cal / n.calorieGoal) * 100))
    : 0;

  const macros = [
    {
      label: "Protein",
      val: Math.round(n.totals.proteinG),
      goal: n.proteinGoal,
      color: "var(--accent)",
      unit: "g",
    },
    {
      label: "Carbs",
      val: Math.round(n.totals.carbsG),
      goal: null,
      color: "var(--accent-2)",
      unit: "g",
    },
    {
      label: "Fat",
      val: Math.round(n.totals.fatG),
      goal: null,
      color: "var(--accent-3)",
      unit: "g",
    },
  ];

  const suppDone = n.supplements.filter((s) => s.taken).length;

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12 space-y-8">
        <PhotoHero
          queryKey="page:nutrition"
          title="Nutrition"
          subtitle="Fuel the work — today's intake, water and supplements."
        />

        {/* Calories + macros */}
        <section className="card p-6 animate-fade-up">
          <div className="flex items-center gap-6">
            <AnimatedRing
              pct={n.calorieGoal ? calPct : 0}
              size={120}
              stroke={12}
              color="var(--accent)"
            >
              <div className="text-center leading-tight">
                <div className="font-display font-bold text-xl">{cal}</div>
                <div className="text-[10px] text-muted">
                  {n.calorieGoal ? `/ ${n.calorieGoal}` : "kcal"}
                </div>
              </div>
            </AnimatedRing>
            <div className="flex-1 space-y-3">
              {macros.map((m) => {
                const pct = m.goal
                  ? Math.min(100, Math.round((m.val / m.goal) * 100))
                  : null;
                return (
                  <div key={m.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{m.label}</span>
                      <span className="text-muted">
                        {m.val}
                        {m.goal ? ` / ${m.goal}` : ""} {m.unit}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct ?? (m.val > 0 ? 100 : 0)}%`,
                          background: m.color,
                          opacity: pct == null ? 0.5 : 1,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Food log */}
        <section className="card p-6 animate-fade-up">
          <h2 className="section-title mb-4">Food log</h2>
          <FoodLog entries={n.entries} />
        </section>

        {/* Water */}
        <section className="card p-6 animate-fade-up">
          <h2 className="section-title mb-4">💧 Water</h2>
          <WaterTracker waterMl={n.waterMl} />
        </section>

        {/* Supplements */}
        <section className="card p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">💊 Supplements</h2>
            {n.supplements.length > 0 && (
              <span className="text-xs text-muted">
                {suppDone}/{n.supplements.length} taken
              </span>
            )}
          </div>
          <SupplementChecklist supplements={n.supplements} />
        </section>

        {/* Goals */}
        <section className="card p-6 animate-fade-up">
          <h2 className="section-title mb-4">Goals & setup</h2>
          <NutritionGoals
            calorieGoal={n.calorieGoal}
            proteinGoal={n.proteinGoal}
            supplements={n.supplements.map((s) => s.name).join(", ")}
          />
        </section>
      </main>
    </>
  );
}
