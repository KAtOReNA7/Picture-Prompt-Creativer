-- AlterTable
ALTER TABLE "GeneratedImage" ADD COLUMN "originAnalysisId" TEXT;

-- CreateIndex
CREATE INDEX "GeneratedImage_originAnalysisId_idx" ON "GeneratedImage"("originAnalysisId");
