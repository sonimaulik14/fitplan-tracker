import { weightNum, type Unit } from "@/lib/ui";

type Point = { date: string; weight: number };

export default function BodyweightChart({
  points: rawPoints,
  unit,
}: {
  points: Point[];
  unit: Unit;
}) {
  if (rawPoints.length < 2) {
    return (
      <p className="text-sm text-muted">
        Log at least two weigh-ins to see your trend.
      </p>
    );
  }

  // convert stored kg → display unit
  const points = rawPoints.map((p) => ({
    date: p.date,
    weight: weightNum(p.weight, unit),
  }));

  const W = 640;
  const H = 200;
  const pad = { l: 36, r: 12, t: 14, b: 22 };
  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = max - min || 1;
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;

  const x = (i: number) =>
    pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (w: number) =>
    pad.t + (1 - (w - lo) / (hi - lo)) * (H - pad.t - pad.b);

  const line = points.map((p, i) => `${x(i)},${y(p.weight)}`).join(" ");
  const area = `${pad.l},${H - pad.b} ${line} ${x(points.length - 1)},${H - pad.b}`;

  const first = points[0].weight;
  const last = points[points.length - 1].weight;
  const delta = +(last - first).toFixed(1);

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-3xl font-display font-bold">{last}</span>
        <span className="text-sm text-muted">{unit} now</span>
        <span
          className={`text-sm font-semibold ${
            delta < 0
              ? "text-accent-2"
              : delta > 0
                ? "text-accent"
                : "text-muted"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {delta} {unit} since start
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <defs>
          <linearGradient id="bw-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[lo, (lo + hi) / 2, hi].map((v, i) => (
          <g key={i}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--border)"
              strokeDasharray="3 4"
            />
            <text
              x={4}
              y={y(v) + 3}
              fontSize="10"
              fill="var(--muted)"
            >
              {Math.round(v)}
            </text>
          </g>
        ))}
        <polygon points={area} fill="url(#bw-fill)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.weight)}
            r="3"
            fill="var(--background)"
            stroke="var(--accent)"
            strokeWidth="2"
          >
            <title>{`${p.date}: ${p.weight} ${unit}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
