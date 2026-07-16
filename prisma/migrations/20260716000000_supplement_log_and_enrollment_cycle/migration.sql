-- Per-workout-day supplements get a real table (replacing the DailyLog
-- "wd:<workoutDayId>" key hack), and Enrollment gains repeatable cycles.
-- ORDER MATTERS: the backfill joins Enrollment on (userId, planId), which is
-- only unambiguous while the old two-column unique is still in force — so the
-- backfill runs before the index swap, all in one transaction.

-- CreateTable
CREATE TABLE "WorkoutDaySupplementLog" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "workoutDayId" TEXT NOT NULL,
    "supplementsTaken" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "WorkoutDaySupplementLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutDaySupplementLog_enrollmentId_workoutDayId_key"
    ON "WorkoutDaySupplementLog"("enrollmentId", "workoutDayId");

-- AddForeignKey
ALTER TABLE "WorkoutDaySupplementLog"
    ADD CONSTRAINT "WorkoutDaySupplementLog_enrollmentId_fkey"
    FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutDaySupplementLog"
    ADD CONSTRAINT "WorkoutDaySupplementLog_workoutDayId_fkey"
    FOREIGN KEY ("workoutDayId") REFERENCES "WorkoutDay"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill from legacy DailyLog "wd:" rows. Rows whose workout day no longer
-- exists or whose user has no enrollment for that plan are unreachable
-- orphans (the old toggle never verified enrollment) and are dropped by the
-- inner joins. Re-runnable via ON CONFLICT DO NOTHING.
INSERT INTO "WorkoutDaySupplementLog" ("id", "enrollmentId", "workoutDayId", "supplementsTaken")
SELECT gen_random_uuid()::text, e."id", wd."id", dl."supplementsTaken"
FROM "DailyLog" dl
JOIN "WorkoutDay" wd ON wd."id" = substring(dl."day" FROM 4)
JOIN "Week" w ON w."id" = wd."weekId"
JOIN "Enrollment" e ON e."userId" = dl."userId" AND e."planId" = w."planId"
WHERE dl."day" LIKE 'wd:%'
ON CONFLICT ("enrollmentId", "workoutDayId") DO NOTHING;

-- DailyLog returns to strictly YYYY-MM-DD rows (water + date-keyed data).
DELETE FROM "DailyLog" WHERE "day" LIKE 'wd:%';

-- Enrollment cycles: a completed program can be run again as a fresh
-- enrollment row with cycle+1; history stays queryable on the old row.
ALTER TABLE "Enrollment" ADD COLUMN "cycle" INTEGER NOT NULL DEFAULT 1;

-- DropIndex (all existing rows are cycle 1, so uniqueness is preserved)
DROP INDEX "Enrollment_userId_planId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_userId_planId_cycle_key"
    ON "Enrollment"("userId", "planId", "cycle");
