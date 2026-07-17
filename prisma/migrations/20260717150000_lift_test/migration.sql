-- Tested 1RM attempts from guided test days. Lives outside the plan structure
-- (SetEntry requires a planExerciseId) and feeds the strength profile.
CREATE TABLE "LiftTest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "liftKey" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL DEFAULT 1,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiftTest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LiftTest_userId_idx" ON "LiftTest"("userId");

ALTER TABLE "LiftTest" ADD CONSTRAINT "LiftTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
