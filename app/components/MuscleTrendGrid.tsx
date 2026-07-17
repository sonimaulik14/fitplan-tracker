import {
  VOLUME_LANDMARKS,
  muscleTint,
  heatIntensity,
} from "@/lib/ui";
import { MuscleGlyph } from "@/app/components/icons";
import type { MuscleWeekRow } from "@/lib/metrics/progress";

// Only the muscles that have evidence-based landmarks get a heat scale.
const LANDMARK_MUSCLES = Object.keys(VOLUME_LANDMARKS);

export default function MuscleTrendGrid({
  rows,
  currentWeek,
}: {
  rows: MuscleWeekRow[];
  currentWeek: number;
}) {
  const weeks = [...rows].sort((a, b) => a.weekNumber - b.weekNumber);
  const present = LANDMARK_MUSCLES.filter((m) =>
    weeks.some((w) => (w.byMuscle[m] ?? 0) > 0)
  );

  if (present.length === 0) {
    return (
      <p className="text-muted text-sm">
        Log a few working sets across your weeks to build the trend grid.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-separate" style={{ borderSpacing: "3px" }}>
        <thead>
          <tr>
            <th className="w-24" />
            {weeks.map((w) => {
              const isCurrent = w.weekNumber === currentWeek;
              return (
                <th
                  key={w.weekNumber}
                  className={`text-[10px] font-medium px-0.5 pb-1 ${
                    isCurrent ? "text-accent" : "text-muted"
                  }`}
                >
                  <span
                    className={isCurrent ? "border-b-2 border-accent pb-0.5" : ""}
                  >
                    W{w.weekNumber}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {present.map((m) => {
            const l = VOLUME_LANDMARKS[m];
            return (
              <tr key={m}>
                <td className="pr-3 text-xs whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <MuscleGlyph muscle={m} size={13} />
                    {m}
                  </span>
                </td>
                {weeks.map((w) => {
                  const sets = w.byMuscle[m] ?? 0;
                  const isCurrent = w.weekNumber === currentWeek;
                  return (
                    <td key={w.weekNumber} className="p-0">
                      <div
                        className={`w-6 h-6 rounded-sm ${
                          isCurrent ? "ring-1 ring-accent/60" : ""
                        }`}
                        style={{ background: muscleTint(m, heatIntensity(sets, l)) }}
                        title={`Week ${w.weekNumber} · ${m} · ${sets} set${sets === 1 ? "" : "s"}`}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
