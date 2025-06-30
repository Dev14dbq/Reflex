-- CreateTable
CREATE TABLE "AdUserClick" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdUserClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdUserClick_userId_idx" ON "AdUserClick"("userId");

-- CreateIndex
CREATE INDEX "AdUserClick_campaignId_idx" ON "AdUserClick"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "AdUserClick_userId_campaignId_key" ON "AdUserClick"("userId", "campaignId");

-- AddForeignKey
ALTER TABLE "AdUserClick" ADD CONSTRAINT "AdUserClick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdUserClick" ADD CONSTRAINT "AdUserClick_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
