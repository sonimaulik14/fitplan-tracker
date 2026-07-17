-- Daily readiness check-in (all nullable = unanswered that day).
-- sleepQuality/energy: 1 worst -> 5 best. soreness: 1 none -> 5 very sore
-- (inverted at scoring time in lib/readiness.ts).
ALTER TABLE "DailyLog" ADD COLUMN "sleepQuality" INTEGER;
ALTER TABLE "DailyLog" ADD COLUMN "soreness" INTEGER;
ALTER TABLE "DailyLog" ADD COLUMN "energy" INTEGER;
