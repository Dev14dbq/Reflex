/*
  Warnings:

  - You are about to drop the column `fromUserId` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `moderatorId` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `targetChatId` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `targetMessageId` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `targetUserId` on the `Complaint` table. All the data in the column will be lost.
  - You are about to drop the column `authorId` on the `News` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `News` table. All the data in the column will be lost.
  - You are about to drop the column `published` on the `News` table. All the data in the column will be lost.
  - You are about to drop the column `views` on the `News` table. All the data in the column will be lost.
  - You are about to drop the `AdAnalytics` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdTargeting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdminChat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdminMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Advertisement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserRole` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `reporterId` to the `Complaint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Complaint` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Complaint` table without a default value. This is not possible if the table is not empty.
  - Made the column `description` on table `Complaint` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `createdBy` to the `News` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AdAnalytics" DROP CONSTRAINT "AdAnalytics_advertisementId_fkey";

-- DropForeignKey
ALTER TABLE "AdAnalytics" DROP CONSTRAINT "AdAnalytics_userId_fkey";

-- DropForeignKey
ALTER TABLE "AdTargeting" DROP CONSTRAINT "AdTargeting_advertisementId_fkey";

-- DropForeignKey
ALTER TABLE "AdminChat" DROP CONSTRAINT "AdminChat_userId_fkey";

-- DropForeignKey
ALTER TABLE "AdminMessage" DROP CONSTRAINT "AdminMessage_chatId_fkey";

-- DropForeignKey
ALTER TABLE "AdminMessage" DROP CONSTRAINT "AdminMessage_senderId_fkey";

-- DropForeignKey
ALTER TABLE "Advertisement" DROP CONSTRAINT "Advertisement_advertiserId_fkey";

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_fromUserId_fkey";

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_moderatorId_fkey";

-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_targetUserId_fkey";

-- DropForeignKey
ALTER TABLE "News" DROP CONSTRAINT "News_authorId_fkey";

-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_grantedBy_fkey";

-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_roleId_fkey";

-- DropForeignKey
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_userId_fkey";

-- DropIndex
DROP INDEX "Complaint_fromUserId_idx";

-- DropIndex
DROP INDEX "Complaint_targetUserId_idx";

-- DropIndex
DROP INDEX "News_published_publishedAt_idx";

-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "fromUserId",
DROP COLUMN "moderatorId",
DROP COLUMN "targetChatId",
DROP COLUMN "targetMessageId",
DROP COLUMN "targetUserId",
ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "evidence" JSONB,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "reporterId" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "description" SET NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isSystemMessage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "systemSenderName" TEXT,
ADD COLUMN     "systemSenderType" TEXT;

-- AlterTable
ALTER TABLE "News" DROP COLUMN "authorId",
DROP COLUMN "imageUrl",
DROP COLUMN "published",
DROP COLUMN "views",
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "readCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sentCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "targetUsers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "type" SET DEFAULT 'news';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedBy" TEXT,
ADD COLUMN     "moderationNote" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "adInterests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "notifyModeration" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyTechUpdates" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blockedBy" TEXT,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAdvertiser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isModerator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roleGrantedAt" TIMESTAMP(3),
ADD COLUMN     "roleGrantedBy" TEXT;

-- DropTable
DROP TABLE "AdAnalytics";

-- DropTable
DROP TABLE "AdTargeting";

-- DropTable
DROP TABLE "AdminChat";

-- DropTable
DROP TABLE "AdminMessage";

-- DropTable
DROP TABLE "Advertisement";

-- DropTable
DROP TABLE "Role";

-- DropTable
DROP TABLE "UserRole";

-- CreateTable
CREATE TABLE "ModeratorAction" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModeratorAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL,
    "advertiserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "adTitle" TEXT NOT NULL,
    "adDescription" TEXT NOT NULL,
    "adImageUrl" TEXT,
    "buttonText" TEXT NOT NULL DEFAULT 'Узнать больше',
    "buttonUrl" TEXT NOT NULL,
    "targetAgeMin" INTEGER,
    "targetAgeMax" INTEGER,
    "targetGenders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetCities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetInterests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weight" INTEGER NOT NULL DEFAULT 1,
    "dailyBudget" INTEGER,
    "totalBudget" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdAnalytic" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "uniqueViews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdAnalytic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModeratorAction_moderatorId_idx" ON "ModeratorAction"("moderatorId");

-- CreateIndex
CREATE INDEX "ModeratorAction_userId_idx" ON "ModeratorAction"("userId");

-- CreateIndex
CREATE INDEX "ModeratorAction_action_idx" ON "ModeratorAction"("action");

-- CreateIndex
CREATE INDEX "ModeratorAction_createdAt_idx" ON "ModeratorAction"("createdAt");

-- CreateIndex
CREATE INDEX "AdCampaign_status_idx" ON "AdCampaign"("status");

-- CreateIndex
CREATE INDEX "AdCampaign_advertiserId_idx" ON "AdCampaign"("advertiserId");

-- CreateIndex
CREATE INDEX "AdCampaign_weight_idx" ON "AdCampaign"("weight");

-- CreateIndex
CREATE INDEX "AdCampaign_startDate_idx" ON "AdCampaign"("startDate");

-- CreateIndex
CREATE INDEX "AdCampaign_endDate_idx" ON "AdCampaign"("endDate");

-- CreateIndex
CREATE INDEX "AdAnalytic_campaignId_idx" ON "AdAnalytic"("campaignId");

-- CreateIndex
CREATE INDEX "AdAnalytic_date_idx" ON "AdAnalytic"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AdAnalytic_campaignId_date_key" ON "AdAnalytic"("campaignId", "date");

-- CreateIndex
CREATE INDEX "Complaint_priority_idx" ON "Complaint"("priority");

-- CreateIndex
CREATE INDEX "Complaint_assignedTo_idx" ON "Complaint"("assignedTo");

-- CreateIndex
CREATE INDEX "Complaint_createdAt_idx" ON "Complaint"("createdAt");

-- CreateIndex
CREATE INDEX "Image_isApproved_idx" ON "Image"("isApproved");

-- CreateIndex
CREATE INDEX "Message_isSystemMessage_idx" ON "Message"("isSystemMessage");

-- CreateIndex
CREATE INDEX "News_isPublished_idx" ON "News"("isPublished");

-- CreateIndex
CREATE INDEX "News_publishedAt_idx" ON "News"("publishedAt");

-- CreateIndex
CREATE INDEX "News_priority_idx" ON "News"("priority");

-- CreateIndex
CREATE INDEX "Profile_isVerified_idx" ON "Profile"("isVerified");

-- CreateIndex
CREATE INDEX "Profile_isFlagged_idx" ON "Profile"("isFlagged");

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeratorAction" ADD CONSTRAINT "ModeratorAction_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModeratorAction" ADD CONSTRAINT "ModeratorAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "News" ADD CONSTRAINT "News_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdAnalytic" ADD CONSTRAINT "AdAnalytic_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
