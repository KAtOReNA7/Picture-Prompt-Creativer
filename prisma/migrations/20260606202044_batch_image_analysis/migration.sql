-- CreateTable
CREATE TABLE "BatchAnalysisTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "uploadingCount" INTEGER NOT NULL DEFAULT 0,
    "processingCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "canceledCount" INTEGER NOT NULL DEFAULT 0,
    "maxItems" INTEGER NOT NULL DEFAULT 100,
    "maxFileSizeMB" INTEGER NOT NULL DEFAULT 40,
    "concurrency" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "finishedAt" DATETIME
);

-- CreateTable
CREATE TABLE "BatchAnalysisItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "imageId" TEXT,
    "analysisId" TEXT,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    CONSTRAINT "BatchAnalysisItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "BatchAnalysisTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BatchAnalysisItem_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "ImageAsset" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BatchAnalysisItem_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "PromptAnalysis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BatchAnalysisItem_taskId_status_idx" ON "BatchAnalysisItem"("taskId", "status");

-- CreateIndex
CREATE INDEX "BatchAnalysisItem_imageId_idx" ON "BatchAnalysisItem"("imageId");

-- CreateIndex
CREATE INDEX "BatchAnalysisItem_analysisId_idx" ON "BatchAnalysisItem"("analysisId");
