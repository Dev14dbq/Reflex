-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "resolvedBy" TEXT;

-- CreateTable
CREATE TABLE "ModeratorMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT,
    "content" TEXT NOT NULL,
    "fromModerator" BOOLEAN NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModeratorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModeratorMessage_userId_idx" ON "ModeratorMessage"("userId");

-- CreateIndex
CREATE INDEX "ModeratorMessage_moderatorId_idx" ON "ModeratorMessage"("moderatorId");

-- CreateIndex
CREATE INDEX "ModeratorMessage_fromModerator_idx" ON "ModeratorMessage"("fromModerator");

-- CreateIndex
CREATE INDEX "ModeratorMessage_isRead_idx" ON "ModeratorMessage"("isRead");

-- CreateIndex
CREATE INDEX "ModeratorMessage_createdAt_idx" ON "ModeratorMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "ModeratorMessage" ADD CONSTRAINT "ModeratorMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeratorMessage" ADD CONSTRAINT "ModeratorMessage_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
