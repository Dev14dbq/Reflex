-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notifyMessages" BOOLEAN NOT NULL DEFAULT true,
    "notifyLikes" BOOLEAN NOT NULL DEFAULT true,
    "notifyNews" BOOLEAN NOT NULL DEFAULT true,
    "notifyAds" BOOLEAN NOT NULL DEFAULT true,
    "notifyTech" BOOLEAN NOT NULL DEFAULT false,
    "sameCityOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_userId_key" ON "Settings"("userId");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
