/*
  Warnings:

  - A unique constraint covering the columns `[fromUserId,toProfileId]` on the table `Like` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Like_fromUserId_toProfileId_key" ON "Like"("fromUserId", "toProfileId");
