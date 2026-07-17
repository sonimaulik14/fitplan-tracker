-- Plan share links: unguessable public handle, null = private.
ALTER TABLE "Plan" ADD COLUMN "shareToken" TEXT;
CREATE UNIQUE INDEX "Plan_shareToken_key" ON "Plan"("shareToken");

-- Weekly "week in review" push digest: opt-out flag + per-week dedupe key.
ALTER TABLE "User" ADD COLUMN "weeklyReviewOn" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "lastWeeklyReviewWeek" TEXT;
