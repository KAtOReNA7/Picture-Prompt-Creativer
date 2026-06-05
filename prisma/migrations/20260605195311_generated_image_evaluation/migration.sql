-- CreateTable
CREATE TABLE "GeneratedImageEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generatedImageId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "promptMatchScore" INTEGER NOT NULL,
    "styleRetentionScore" INTEGER,
    "requirementMatchScore" INTEGER,
    "compositionScore" INTEGER NOT NULL,
    "colorScore" INTEGER NOT NULL,
    "lightingScore" INTEGER NOT NULL,
    "subjectScore" INTEGER NOT NULL,
    "commercialPotentialScore" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "strengths" TEXT NOT NULL,
    "weaknesses" TEXT NOT NULL,
    "improvementAdvice" TEXT NOT NULL,
    "improvedPrompt" TEXT NOT NULL,
    "improvedNegativePrompt" TEXT,
    "rawJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedImageEvaluation_generatedImageId_fkey" FOREIGN KEY ("generatedImageId") REFERENCES "GeneratedImage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
