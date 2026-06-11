import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMeasurements, getBodyweightSeries } from "@/lib/metrics";
import {
  weightNum,
  cmToLen,
  lengthUnit,
  type Unit,
} from "@/lib/ui";
import NavBar from "@/app/components/NavBar";
import PhotoHero from "@/app/components/PhotoHero";
import { MeasurementForm, GoalWeightForm } from "@/app/components/MeasurementForms";

export const metadata = { title: "Measurements & goals" };

export default async function MeasurementsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unit = user.unit as Unit;
  const lu = lengthUnit(unit);

  const [m, series] = await Promise.all([
    getMeasurements(user.id),
    getBodyweightSeries(user.id),
  ]);

  const latestWeightKg = series.length ? series[series.length - 1].weight : null;
  const startWeightKg = series.length ? series[0].weight : null;
  const goalKg = user.goalWeightKg ?? null;

  // Bodyweight → goal progress.
  let goalPct: number | null = null;
  if (goalKg != null && latestWeightKg != null && startWeightKg != null) {
    const total = startWeightKg - goalKg;
    const done = startWeightKg - latestWeightKg;
    goalPct =
      total === 0
        ? 100
        : Math.max(0, Math.min(100, Math.round((done / total) * 100)));
  }

  const fmtLen = (cm: number) => `${cmToLen(cm, unit)} ${lu}`;

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12 space-y-8">
        <PhotoHero
          queryKey="page:measurements"
          title="Measurements & goals"
          subtitle="Track your body alongside your training."
        />

        {/* Goal weight */}
        <section className="card p-6 animate-fade-up">
          <h2 className="section-title mb-4">Weight goal</h2>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2 mb-4">
            <Stat
              label="Current"
              value={
                latestWeightKg != null
                  ? `${weightNum(latestWeightKg, unit)} ${unit}`
                  : "—"
              }
            />
            <Stat
              label="Goal"
              value={goalKg != null ? `${weightNum(goalKg, unit)} ${unit}` : "—"}
            />
            {latestWeightKg != null && goalKg != null && (
              <Stat
                label="To go"
                value={`${Math.abs(weightNum(latestWeightKg - goalKg, unit))} ${unit}`}
              />
            )}
          </div>
          {goalPct != null && (
            <div className="mb-5">
              <div className="flex justify-between text-xs text-muted mb-1.5">
                <span>Progress to goal</span>
                <span>{goalPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hi"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
            </div>
          )}
          <GoalWeightForm
            unit={unit}
            current={goalKg != null ? weightNum(goalKg, unit) : null}
          />
        </section>

        {/* Latest measurements */}
        <section className="card p-6 animate-fade-up">
          <h2 className="section-title mb-4">Latest measurements</h2>
          {m.summary.every((s) => s.latest == null) ? (
            <p className="text-muted text-sm mb-5">
              No measurements logged yet — add your first set below.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
              {m.summary
                .filter((s) => s.latest != null)
                .map((s) => {
                  const isPct = s.key === "bodyFat";
                  const val = isPct
                    ? `${s.latest!.toFixed(1)}%`
                    : fmtLen(s.latest!);
                  const ch =
                    s.change == null
                      ? null
                      : isPct
                        ? s.change
                        : cmToLen(Math.abs(s.change), unit) *
                          Math.sign(s.change);
                  return (
                    <div
                      key={s.key}
                      className="rounded-xl border border-border bg-surface-2 p-3"
                    >
                      <div className="text-xs text-muted">
                        {s.icon} {s.label}
                      </div>
                      <div className="font-display font-bold text-lg mt-1">
                        {val}
                      </div>
                      {ch != null && Math.abs(ch) > 0.05 && (
                        <div
                          className={`text-xs mt-0.5 ${
                            ch < 0 ? "text-accent-2" : "text-amber-400"
                          }`}
                        >
                          {ch > 0 ? "▲" : "▼"} {Math.abs(ch).toFixed(1)}
                          {isPct ? "%" : ` ${lu}`} since start
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
          <h3 className="text-sm font-semibold mb-3">Log new measurements</h3>
          <MeasurementForm unit={unit} />
        </section>

        {/* History */}
        {m.history.length > 0 && (
          <section className="card p-6 animate-fade-up">
            <h2 className="section-title mb-4">History</h2>
            <div className="space-y-2">
              {[...m.history].reverse().map((h) => (
                <div
                  key={h.date}
                  className="flex items-center justify-between gap-3 text-sm border-b border-border last:border-0 pb-2 last:pb-0"
                >
                  <span className="text-muted whitespace-nowrap">
                    {new Date(h.date + "T00:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="flex flex-wrap justify-end gap-x-3 gap-y-0.5 text-right">
                    {Object.entries(h.values).map(([k, v]) => (
                      <span key={k} className="text-xs">
                        <span className="text-muted">
                          {k === "bodyFat"
                            ? "BF"
                            : k.replace("Cm", "").slice(0, 4)}
                        </span>{" "}
                        {k === "bodyFat"
                          ? `${(v as number).toFixed(1)}%`
                          : fmtLen(v as number)}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display font-bold text-xl">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
