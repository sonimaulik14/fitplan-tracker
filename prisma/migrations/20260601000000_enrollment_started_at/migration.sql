-- "Start program" support: an explicit moment the user began the plan, which
-- anchors Day 1 of the timeline. Null = enrolled but not yet started.
ALTER TABLE "Enrollment" ADD COLUMN "startedAt" TIMESTAMP(3);
