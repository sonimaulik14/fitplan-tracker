-- One-tap light week: all suggested weights run at 90% until this date.
ALTER TABLE "User" ADD COLUMN "lightWeekUntil" TIMESTAMP(3);
