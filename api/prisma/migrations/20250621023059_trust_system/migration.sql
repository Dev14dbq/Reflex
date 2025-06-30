-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "ageRangeMax" INTEGER,
ADD COLUMN     "ageRangeMin" INTEGER,
ADD COLUMN     "localFirst" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxDistance" INTEGER,
ADD COLUMN     "showNsfw" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "similarAge" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blockReason" TEXT,
ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "trustScore" INTEGER NOT NULL DEFAULT 40;

-- CreateTable
CREATE TABLE "TrustLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oldScore" INTEGER NOT NULL,
    "newScore" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrustLog_userId_idx" ON "TrustLog"("userId");

-- CreateIndex
CREATE INDEX "TrustLog_createdAt_idx" ON "TrustLog"("createdAt");

-- AddForeignKey
ALTER TABLE "TrustLog" ADD CONSTRAINT "TrustLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
