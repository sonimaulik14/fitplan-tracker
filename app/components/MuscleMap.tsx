import { type ReactNode } from "react";
import {
  MUSCLE_STYLE,
  muscleTint,
  heatIntensity,
  toneColor,
} from "@/lib/ui";

export type MuscleHeat = {
  muscle: string;
  avg: number; // avg working sets / trained week
  l: { mev: number; mav: number; mrv: number };
  verdict: { label: string; tone: "low" | "good" | "high" };
};

// Muscle buckets shown on the figures (atomic taxonomy — Arms covers biceps and
// triceps, Legs covers quads/hams/glutes; see the legend copy).
const FIGURE_MUSCLES = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Calves", "Abs"];

export default function MuscleMap({
  muscles,
  weeksTrained,
}: {
  muscles: MuscleHeat[];
  weeksTrained: number;
}) {
  const byMuscle = new Map(muscles.map((m) => [m.muscle, m]));
  const anyData = muscles.some((m) => m.avg > 0);

  const fillFor = (muscle: string) => {
    const h = byMuscle.get(muscle);
    return h ? muscleTint(muscle, heatIntensity(h.avg, h.l)) : "var(--surface-2)";
  };
  const strokeFor = (muscle: string) => {
    const h = byMuscle.get(muscle);
    return h ? toneColor(h.verdict.tone) : "var(--border)";
  };
  const titleFor = (muscle: string) => {
    const h = byMuscle.get(muscle);
    return h ? `${muscle} · ${h.avg.toFixed(1)} sets/wk · ${h.verdict.label}` : `${muscle} · no data`;
  };

  // A muscle region: one <g> whose fill/stroke are inherited by its shapes, with
  // a hover <title>. Regions with no data fall back to the neutral surface.
  const Region = ({ muscle, children }: { muscle: string; children: ReactNode }) => (
    <g
      fill={fillFor(muscle)}
      stroke={strokeFor(muscle)}
      strokeWidth={1.5}
      strokeLinejoin="round"
    >
      <title>{titleFor(muscle)}</title>
      {children}
    </g>
  );

  // Body parts that carry no muscle bucket (head, forearms, hands, feet) — drawn
  // faintly so the coloured regions read as part of a whole body.
  const Neutral = () => (
    <g fill="var(--surface-2)" stroke="var(--border)" strokeWidth={1} strokeLinejoin="round">
      <circle cx={80} cy={26} r={14} />
      <rect x={72} y={37} width={16} height={10} rx={4} />
      {/* forearms */}
      <rect x={38} y={110} width={14} height={46} rx={7} />
      <rect x={108} y={110} width={14} height={46} rx={7} />
      {/* hands */}
      <circle cx={45} cy={162} r={6} />
      <circle cx={115} cy={162} r={6} />
      {/* feet */}
      <rect x={62} y={268} width={16} height={9} rx={4} />
      <rect x={82} y={268} width={16} height={9} rx={4} />
    </g>
  );

  // Shared regions (identical geometry front & back).
  const Delts = () => (
    <Region muscle="Shoulders">
      <ellipse cx={57} cy={60} rx={14} ry={11} />
      <ellipse cx={103} cy={60} rx={14} ry={11} />
    </Region>
  );
  const UpperArms = () => (
    <Region muscle="Arms">
      <rect x={39} y={57} width={15} height={50} rx={7.5} />
      <rect x={106} y={57} width={15} height={50} rx={7.5} />
    </Region>
  );
  const Calves = () => (
    <Region muscle="Calves">
      <rect x={63} y={216} width={16} height={50} rx={8} />
      <rect x={81} y={216} width={16} height={50} rx={8} />
    </Region>
  );

  const Front = () => (
    <>
      <Neutral />
      <Delts />
      <UpperArms />
      <Region muscle="Chest">
        <rect x={59} y={58} width={20} height={26} rx={7} />
        <rect x={81} y={58} width={20} height={26} rx={7} />
      </Region>
      <Region muscle="Abs">
        <rect x={67} y={90} width={26} height={56} rx={9} />
      </Region>
      <Region muscle="Legs">
        {/* quads */}
        <rect x={61} y={150} width={17} height={64} rx={8.5} />
        <rect x={82} y={150} width={17} height={64} rx={8.5} />
      </Region>
      <Calves />
    </>
  );

  const Back = () => (
    <>
      <Neutral />
      <Delts />
      <UpperArms />
      <Region muscle="Back">
        {/* lats/traps slab — wider at shoulders, tapering to the waist */}
        <path d="M60 56 H100 L95 128 H65 Z" />
      </Region>
      <Region muscle="Legs">
        {/* glutes + hamstrings */}
        <rect x={62} y={146} width={36} height={26} rx={11} />
        <rect x={61} y={172} width={17} height={44} rx={8.5} />
        <rect x={82} y={172} width={17} height={44} rx={8.5} />
      </Region>
      <Calves />
    </>
  );

  return (
    <div>
      <svg viewBox="0 0 400 300" className="w-full h-auto" role="img" aria-label="Muscle training map">
        <g transform="translate(15,10)">
          <Front />
        </g>
        <g transform="translate(210,10)">
          <Back />
        </g>
        <text x={95} y={296} textAnchor="middle" fontSize={11} fill="var(--muted)">
          Front
        </text>
        <text x={290} y={296} textAnchor="middle" fontSize={11} fill="var(--muted)">
          Back
        </text>
      </svg>

      {!anyData && (
        <p className="text-sm text-muted text-center -mt-2 mb-4">
          Log some working sets to light up your muscle map.
        </p>
      )}

      {/* Legend: muscle swatches + what fill and outline encode. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        {FIGURE_MUSCLES.map((m) => (
          <span key={m} className="flex items-center gap-1.5 text-xs text-muted">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: MUSCLE_STYLE[m]?.color }}
            />
            {m}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-muted mt-3 leading-relaxed">
        Fill intensity = avg working sets per week (vs max recoverable volume).
        Outline shows the verdict:{" "}
        <span style={{ color: "var(--warn)" }}>under</span>,{" "}
        <span style={{ color: "var(--success)" }}>productive</span>,{" "}
        <span style={{ color: "var(--danger)" }}>over</span>. Arms covers biceps &
        triceps; Legs covers quads, hamstrings & glutes.
      </p>
    </div>
  );
}
