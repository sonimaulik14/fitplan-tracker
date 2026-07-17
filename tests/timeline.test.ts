import { describe, it, expect } from "vitest";
import { buildTimeline } from "@/lib/metrics/progress";

// Minimal fake ProgressResult: buildTimeline only reads startedAt, started,
// and days[{dayId, weekNumber, label, focus, status, ...}].
const day = (
  i: number,
  status: "not_started" | "in_progress" | "completed" | "skipped",
  focus = "Push"
) => ({
  dayId: `d${i}`,
  weekNumber: 1,
  label: `Day ${i}`,
  focus,
  status,
  prescribedSets: 10,
  doneSets: 0,
  exerciseCount: 3,
  estMinutes: 30,
  performedDate: null,
});

const fakeProgress = (days: ReturnType<typeof day>[]) =>
  ({
    started: true,
    startedAt: new Date(2026, 6, 1), // Jul 1 local
    days,
  }) as never;

describe("buildTimeline with skipped days", () => {
  const today = new Date(2026, 6, 8); // Jul 8: days 1-7 past, day 8 today

  it("skipped days are not missed and drop out of the schedule debt", () => {
    const t = buildTimeline(
      fakeProgress([
        day(1, "completed"),
        day(2, "skipped"),
        day(3, "not_started"),
        day(4, "not_started", "Rest"),
        day(5, "completed"),
        day(6, "skipped"),
        day(7, "not_started"),
        day(8, "not_started"),
      ]),
      today
    );
    const byId = new Map(t.days.map((d) => [d.dayId, d]));
    expect(byId.get("d2")!.missed).toBe(false);
    expect(byId.get("d6")!.missed).toBe(false);
    expect(byId.get("d3")!.missed).toBe(true);
    expect(byId.get("d7")!.missed).toBe(true);
    // dueByToday: 7 past+today non-rest days minus 2 skipped = 5
    expect(t.dueByToday).toBe(5);
    expect(t.doneByToday).toBe(2);
    expect(t.behind).toBe(3);
  });

  it("skipping everything clears the debt without inflating completions", () => {
    const t = buildTimeline(
      fakeProgress([day(1, "skipped"), day(2, "skipped"), day(3, "completed")]),
      today
    );
    expect(t.behind).toBe(0);
    expect(t.completedWorkouts).toBe(1);
  });
});
