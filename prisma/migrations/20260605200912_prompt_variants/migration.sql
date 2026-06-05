-- CreateTable
CREATE TABLE "PromptVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "userNote" TEXT,
    "composedPrompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "editedSegmentsJson" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptVariant_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "PromptAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
