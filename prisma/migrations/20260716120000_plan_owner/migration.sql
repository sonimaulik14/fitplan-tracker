-- Custom programs: plans gain an optional owner. Null = built-in (seeded,
-- global); set = user-authored, visible only to its owner and deleted with
-- the account.

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "Plan_ownerId_idx" ON "Plan"("ownerId");

-- AddForeignKey
ALTER TABLE "Plan"
    ADD CONSTRAINT "Plan_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
