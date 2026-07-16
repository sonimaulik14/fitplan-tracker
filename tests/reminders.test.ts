import { describe, it, expect } from "vitest";
import { reminderDecision, type ReminderUser } from "@/lib/reminders";

// 2026-07-15 is a Wednesday (weekday 3). Asia/Kolkata is UTC+5:30.
const kolkataUser = (overrides: Partial<ReminderUser> = {}): ReminderUser => ({
  timezone: "Asia/Kolkata",
  reminderTime: "18:00",
  trainingDays: "1,3,5",
  lastNotifiedDay: null,
  ...overrides,
});

describe("reminderDecision — timezone-local evaluation", () => {
  it("is due once local time passes reminderTime even though the UTC hour differs", () => {
    // 13:00 UTC = 18:30 IST on Wed 2026-07-15 (UTC hour 13 !== local 18).
    const now = new Date(Date.UTC(2026, 6, 15, 13, 0));
    const d = reminderDecision(kolkataUser(), now);
    expect(d).toEqual({ kind: "due", localDate: "2026-07-15" });
  });

  it("is due exactly at reminderTime (string compare is not-less-than)", () => {
    // 12:30 UTC = 18:00 IST sharp.
    const now = new Date(Date.UTC(2026, 6, 15, 12, 30));
    expect(reminderDecision(kolkataUser(), now).kind).toBe("due");
  });

  it("skips before the local reminder time", () => {
    // 12:00 UTC = 17:30 IST < 18:00.
    const now = new Date(Date.UTC(2026, 6, 15, 12, 0));
    const d = reminderDecision(kolkataUser(), now);
    expect(d).toEqual({ kind: "skip-before-time", localDate: "2026-07-15" });
  });

  it("uses the LOCAL calendar day when it differs from the UTC day", () => {
    // 20:00 UTC Jul 15 = 01:30 IST on THURSDAY Jul 16 (weekday 4).
    const now = new Date(Date.UTC(2026, 6, 15, 20, 0));
    const d = reminderDecision(
      kolkataUser({ reminderTime: "01:00", trainingDays: "4" }),
      now
    );
    expect(d).toEqual({ kind: "due", localDate: "2026-07-16" });
  });
});

describe("reminderDecision — already notified", () => {
  it("skips when lastNotifiedDay equals today's LOCAL date (checked before the time gate)", () => {
    const now = new Date(Date.UTC(2026, 6, 15, 13, 0)); // 18:30 IST Wed
    const d = reminderDecision(kolkataUser({ lastNotifiedDay: "2026-07-15" }), now);
    expect(d).toEqual({ kind: "skip-already-notified", localDate: "2026-07-15" });
  });

  it("does not skip when lastNotifiedDay is a previous day", () => {
    const now = new Date(Date.UTC(2026, 6, 15, 13, 0));
    const d = reminderDecision(kolkataUser({ lastNotifiedDay: "2026-07-14" }), now);
    expect(d.kind).toBe("due");
  });
});

describe("reminderDecision — training-day gate", () => {
  const wedEvening = new Date(Date.UTC(2026, 6, 15, 13, 0)); // Wed 18:30 IST

  it("skips a weekday not in the trainingDays CSV", () => {
    const d = reminderDecision(kolkataUser({ trainingDays: "1,5" }), wedEvening);
    expect(d).toEqual({ kind: "skip-not-training-day", localDate: "2026-07-15" });
  });

  it("is due on a listed training day", () => {
    expect(reminderDecision(kolkataUser({ trainingDays: "3" }), wedEvening).kind).toBe("due");
  });

  // No training days set = remind every day. (Regression guard: Number("")
  // is 0, so a naive CSV parse turned "no days set" into "Sundays only" —
  // empty entries must be dropped before Number().)
  it("null trainingDays reminds on any day (here, a Wednesday)", () => {
    const d = reminderDecision(kolkataUser({ trainingDays: null }), wedEvening);
    expect(d).toEqual({ kind: "due", localDate: "2026-07-15" });
  });

  it("empty-string trainingDays behaves the same as null (daily)", () => {
    const d = reminderDecision(kolkataUser({ trainingDays: "" }), wedEvening);
    expect(d.kind).toBe("due");
  });

  it("null trainingDays is due on a Sunday too", () => {
    // 2026-07-19 is a Sunday; 13:00 UTC = 18:30 IST.
    const sunday = new Date(Date.UTC(2026, 6, 19, 13, 0));
    const d = reminderDecision(kolkataUser({ trainingDays: null }), sunday);
    expect(d).toEqual({ kind: "due", localDate: "2026-07-19" });
  });

  it("ignores non-numeric CSV junk but keeps valid days", () => {
    const d = reminderDecision(kolkataUser({ trainingDays: "abc, 3" }), wedEvening);
    expect(d.kind).toBe("due");
  });
});

describe("reminderDecision — timezone fallback", () => {
  it("falls back to UTC for an invalid timezone string without throwing", () => {
    // 20:00 UTC Wed Jul 15 — in UTC that's past an 18:00 reminder on weekday 3.
    const now = new Date(Date.UTC(2026, 6, 15, 20, 0));
    const user = kolkataUser({ timezone: "Not/AZone", trainingDays: "3" });
    let d: ReturnType<typeof reminderDecision>;
    expect(() => (d = reminderDecision(user, now))).not.toThrow();
    expect(d!).toEqual({ kind: "due", localDate: "2026-07-15" });
  });

  it("treats a null timezone as UTC", () => {
    const now = new Date(Date.UTC(2026, 6, 15, 17, 0)); // 17:00 UTC < 18:00
    const d = reminderDecision(kolkataUser({ timezone: null }), now);
    expect(d).toEqual({ kind: "skip-before-time", localDate: "2026-07-15" });
  });
});

describe("reminderDecision — localDate format", () => {
  it("always reports localDate as zero-padded YYYY-MM-DD", () => {
    const cases: Array<[ReminderUser, Date]> = [
      [kolkataUser(), new Date(Date.UTC(2026, 0, 5, 13, 0))],
      [kolkataUser({ timezone: null }), new Date(Date.UTC(2026, 8, 9, 1, 2))],
      [kolkataUser({ timezone: "bogus" }), new Date(Date.UTC(2026, 11, 31, 23, 59))],
    ];
    for (const [user, now] of cases) {
      expect(reminderDecision(user, now).localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
