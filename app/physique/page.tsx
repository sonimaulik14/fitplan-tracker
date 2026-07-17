import Link from "next/link";
import { Ruler, Camera } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getBodyweightSeries,
  getMeasurements,
  getMeasurementSeries,
  getProgressPhotos,
} from "@/lib/metrics";
import { weightNum, cmToLen, lengthUnit, type Unit } from "@/lib/ui";
import NavBar from "@/app/components/NavBar";
import PhotoHero from "@/app/components/PhotoHero";
import BodyweightChart from "@/app/components/BodyweightChart";
import PhotoCompare from "@/app/components/PhotoCompare";
import Sparkline from "@/app/components/Sparkline";
import { PhotoUploader } from "@/app/components/ProgressClient";

export const metadata = { title: "Physique" };

export default async function PhysiquePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const unit = user.unit as Unit;
  const lu = lengthUnit(unit);

  const [photos, bw, m, series] = await Promise.all([
    getProgressPhotos(user.id),
    getBodyweightSeries(user.id),
    getMeasurements(user.id),
    getMeasurementSeries(user.id),
  ]);

  const latestWeightKg = bw.length ? bw[bw.length - 1].weight : null;
  const startWeightKg = bw.length ? bw[0].weight : null;
  const weightDelta =
    latestWeightKg != null && startWeightKg != null
      ? weightNum(latestWeightKg - startWeightKg, unit)
      : null;
  const goalKg = user.goalWeightKg ?? null;
  let goalPct: number | null = null;
  if (goalKg != null && latestWeightKg != null && startWeightKg != null) {
    const total = startWeightKg - goalKg;
    const done = startWeightKg - latestWeightKg;
    goalPct =
      total === 0
        ? 100
        : Math.max(0, Math.min(100, Math.round((done / total) * 100)));
  }
  const latestBodyFat = m.summary.find((s) => s.key === "bodyFat")?.latest ?? null;

  return (
    <>
      <NavBar user={user} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-5 py-8 pb-28 sm:pb-12 space-y-8">
        <PhotoHero
          queryKey="page:physique"
          eyebrow="Body composition"
          title="Physique"
          subtitle="Photos, bodyweight, and measurements — is your body actually changing?"
        />

        {/* Stat row */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <Stat
            label="Current weight"
            value={
              latestWeightKg != null
                ? `${weightNum(latestWeightKg, unit)} ${unit}`
                : "—"
            }
          />
          {weightDelta != null && (
            <Stat
              label="Since start"
              value={`${weightDelta > 0 ? "+" : ""}${weightDelta} ${unit}`}
              tone={weightDelta < 0 ? "success" : weightDelta > 0 ? "accent" : undefined}
            />
          )}
          {goalKg != null && (
            <Stat label="Goal" value={`${weightNum(goalKg, unit)} ${unit}`} />
          )}
          {latestBodyFat != null && (
            <Stat label="Body fat" value={`${latestBodyFat.toFixed(1)}%`} />
          )}
        </div>

        {/* Photo compare */}
        <section className="card p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="section-title">Before / after</h2>
            <PhotoUploader />
          </div>
          {photos.length >= 2 ? (
            <PhotoCompare
              photos={photos.map((ph) => ({
                id: ph.id,
                dataUrl: ph.dataUrl,
                date: ph.date.toISOString(),
              }))}
              bw={bw}
              unit={unit}
            />
          ) : (
            <p className="text-sm text-muted">
              {photos.length === 0
                ? "Add two progress photos to unlock the compare slider."
                : "One photo down — add another to compare."}
            </p>
          )}
          <Link
            href="/progress"
            className="inline-flex items-center gap-1.5 text-xs text-accent font-semibold hover:underline mt-4"
          >
            <Camera size={13} aria-hidden /> Manage photos →
          </Link>
        </section>

        {/* Bodyweight trajectory */}
        <section className="card p-6 animate-fade-up">
          <h2 className="section-title mb-4">Bodyweight</h2>
          <BodyweightChart points={bw} unit={unit} />
          {goalPct != null ? (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-muted mb-1.5">
                <span>Progress to goal ({weightNum(goalKg!, unit)} {unit})</span>
                <span>{goalPct}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${goalPct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted mt-4">
              No goal weight set —{" "}
              <Link href="/measurements" className="text-accent font-semibold hover:underline">
                set one →
              </Link>
            </p>
          )}
        </section>

        {/* Measurement trends */}
        <section className="card p-6 animate-fade-up">
          <h2 className="section-title mb-4">Measurement trends</h2>
          {m.summary.every((s) => s.latest == null) ? (
            <p className="text-sm text-muted">
              No measurements yet —{" "}
              <Link href="/measurements" className="text-accent font-semibold hover:underline">
                log your first set →
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {m.summary.map((s) => {
                const isPct = s.key === "bodyFat";
                if (s.latest == null)
                  return (
                    <Link
                      key={s.key}
                      href="/measurements"
                      className="rounded-xl border border-border bg-surface-2 p-3 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <div className="text-xs text-muted">
                        {s.icon} {s.label}
                      </div>
                      <div className="text-xs text-muted mt-1.5">
                        Not logged yet — add it →
                      </div>
                    </Link>
                  );
                const val = isPct
                  ? `${s.latest.toFixed(1)}%`
                  : `${cmToLen(s.latest, unit)} ${lu}`;
                const ch =
                  s.change == null
                    ? null
                    : isPct
                      ? s.change
                      : cmToLen(Math.abs(s.change), unit) * Math.sign(s.change);
                return (
                  <div
                    key={s.key}
                    className="rounded-xl border border-border bg-surface-2 p-3"
                  >
                    <div className="text-xs text-muted">
                      {s.icon} {s.label}
                    </div>
                    <div className="font-display font-bold text-lg mt-1">{val}</div>
                    {ch != null && Math.abs(ch) > 0.05 && (
                      <div
                        className={`text-xs mt-0.5 ${
                          ch < 0 ? "text-success" : "text-warn"
                        }`}
                      >
                        {ch > 0 ? "▲" : "▼"} {Math.abs(ch).toFixed(1)}
                        {isPct ? "%" : ` ${lu}`} since start
                      </div>
                    )}
                    <Sparkline
                      points={series[s.key]}
                      title={`${s.label} trend`}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <Link
            href="/measurements"
            className="inline-flex items-center gap-1.5 text-xs text-accent font-semibold hover:underline mt-4"
          >
            <Ruler size={13} aria-hidden /> Log measurements →
          </Link>
        </section>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "accent";
}) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div
        className={`font-display font-bold text-2xl mt-0.5 ${
          tone === "success" ? "text-success" : tone === "accent" ? "text-accent" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
