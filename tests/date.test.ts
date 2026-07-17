import { describe, it, expect } from "vitest";
import { ymd, streakLength, dayKeyInTz } from "@/lib/date";

const k = (y: number, m: number, d: number) => ymd(new Date(y, m, d));

describe("ymd", () => {
  it("formats local date as zero-padded YYYY-MM-DD", () => {
    expect(ymd(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(ymd(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("dayKeyInTz", () => {
  // 22:30 UTC: already tomorrow in Kolkata (+5:30), still today in LA (-7).
  const now = new Date("2026-07-17T22:30:00Z");
  it("resolves the calendar day in the given timezone", () => {
    expect(dayKeyInTz("Asia/Kolkata", now)).toBe("2026-07-18");
    expect(dayKeyInTz("America/Los_Angeles", now)).toBe("2026-07-17");
  });
  it("falls back to the server-local key without a timezone", () => {
    expect(dayKeyInTz(null, now)).toBe(ymd(now));
    expect(dayKeyInTz(undefined, now)).toBe(ymd(now));
  });
  it("falls back on an invalid timezone string", () => {
    expect(dayKeyInTz("Not/AZone", now)).toBe(ymd(now));
  });
});

describe("streakLength", () => {
  const today = new Date(2026, 5, 13); // Sat Jun 13 2026

  it("counts consecutive days ending today", () => {
    const dates = new Set([k(2026, 5, 13), k(2026, 5, 12), k(2026, 5, 11)]);
    expect(streakLength(dates, today)).toBe(3);
  });

  it("keeps the streak alive when today isn't logged yet (counts from yesterday)", () => {
    const dates = new Set([k(2026, 5, 12), k(2026, 5, 11)]);
    expect(streakLength(dates, today)).toBe(2);
  });

  it("breaks on a gap", () => {
    const dates = new Set([k(2026, 5, 13), k(2026, 5, 11)]); // missing the 12th
    expect(streakLength(dates, today)).toBe(1);
  });

  it("is zero when neither today nor yesterday is present", () => {
    expect(streakLength(new Set([k(2026, 5, 10)]), today)).toBe(0);
  });

  it("steps correctly across a month boundary (calendar-day, DST-safe)", () => {
    const t = new Date(2026, 6, 2); // Jul 2
    const dates = new Set([k(2026, 6, 2), k(2026, 6, 1), k(2026, 5, 30)]);
    expect(streakLength(dates, t)).toBe(3);
  });
});
