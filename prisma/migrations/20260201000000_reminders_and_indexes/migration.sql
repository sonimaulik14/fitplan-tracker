-- Reconciles migration history with the live schema.
-- The reminder fields + PushSubscription table were originally applied to the
-- production DB via `prisma db push`; this migration captures them (plus
-- performance indexes) so a fresh `prisma migrate deploy` reproduces the real
-- schema. On databases that already have these (via db push) it is marked
-- applied with `prisma migrate resolve --applied` rather than executed.

-- AlterTable: reminder scheduling fields on User
ALTER TABLE "User" ADD COLUMN "timezone" TEXT;
ALTER TABLE "User" ADD COLUMN "lastNotifiedDay" TEXT;

-- CreateTable: web-push device subscriptions
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex: performance indexes on hot foreign keys / query columns
CREATE INDEX "PlanExercise_workoutDayId_idx" ON "PlanExercise"("workoutDayId");
CREATE INDEX "WorkoutSession_enrollmentId_performedDate_idx" ON "WorkoutSession"("enrollmentId", "performedDate");
CREATE INDEX "SetEntry_planExerciseId_idx" ON "SetEntry"("planExerciseId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
