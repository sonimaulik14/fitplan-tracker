type Cell = { date: string; count: number; level: number };

const LEVEL_PCT = [0, 30, 52, 76, 100];

export default function Heatmap({ grid }: { grid: Cell[] }) {
  if (!grid.length) return null;

  // pad the start so the first column begins on Sunday
  const firstDow = new Date(grid[0].date + "T00:00:00").getDay();
  const cells: (Cell | null)[] = [...Array(firstDow).fill(null), ...grid];

  return (
    <div className="overflow-x-auto">
      <div
        className="grid grid-flow-col gap-1 w-max"
        style={{ gridTemplateRows: "repeat(7, 1fr)" }}
      >
        {cells.map((c, i) =>
          c === null ? (
            <span key={`pad-${i}`} className="w-3 h-3" />
          ) : (
            <span
              key={c.date}
              title={`${c.date}: ${c.count} set${c.count === 1 ? "" : "s"}`}
              className="w-3 h-3 rounded-[3px]"
              style={{
                background:
                  c.level === 0
                    ? "var(--surface-2)"
                    : `color-mix(in srgb, var(--accent) ${LEVEL_PCT[c.level]}%, transparent)`,
              }}
            />
          )
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-xs text-muted">
        <span>Less</span>
        {LEVEL_PCT.map((pct, l) => (
          <span
            key={l}
            className="w-3 h-3 rounded-[3px]"
            style={{
              background:
                l === 0
                  ? "var(--surface-2)"
                  : `color-mix(in srgb, var(--accent) ${pct}%, transparent)`,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
