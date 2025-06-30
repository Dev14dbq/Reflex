-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isNsfw" BOOLEAN NOT NULL DEFAULT false,
    "nsfwScore" DOUBLE PRECISION,
    "nsfwCategories" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "width" INTEGER,
    "height" INTEGER,
    "size" INTEGER,
    "format" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "moderatedAt" TIMESTAMP(3),
    "moderatedBy" TEXT,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Image_profileId_idx" ON "Image"("profileId");

-- CreateIndex
CREATE INDEX "Image_isNsfw_idx" ON "Image"("isNsfw");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
