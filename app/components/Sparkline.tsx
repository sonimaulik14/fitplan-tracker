// Tiny inline-SVG trend line for stat tiles — a shrunken BodyweightChart with
// no axes. Server-safe; renders nothing with fewer than two points.
export default function Sparkline({
  points,
  color = "var(--accent)",
  title,
}: {
  points: { date: string; value: number }[];
  color?: string;
  title?: string;
}) {
  if (points.length < 2) return null;

  const W = 120;
  const H = 36;
  const pad = 3;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (H - pad * 2);
  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-9" aria-hidden={!title}>
      {title && <title>{title}</title>}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle cx={x(points.length - 1)} cy={y(last.value)} r="2.5" fill={color} />
    </svg>
  );
}
