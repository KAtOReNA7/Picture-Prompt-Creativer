-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PromptAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageId" TEXT,
    "title" TEXT,
    "styleSummary" TEXT,
    "visualSubject" TEXT,
    "composition" TEXT,
    "colorPalette" TEXT,
    "lighting" TEXT,
    "texture" TEXT,
    "eraFeeling" TEXT,
    "topicPotential" TEXT,
    "reversePrompt" TEXT,
    "negativePrompt" TEXT,
    "rawJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptAnalysis_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "ImageAsset" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_PromptAnalysis" ("colorPalette", "composition", "createdAt", "eraFeeling", "id", "imageId", "lighting", "negativePrompt", "rawJson", "reversePrompt", "styleSummary", "texture", "title", "topicPotential", "visualSubject") SELECT "colorPalette", "composition", "createdAt", "eraFeeling", "id", "imageId", "lighting", "negativePrompt", "rawJson", "reversePrompt", "styleSummary", "texture", "title", "topicPotential", "visualSubject" FROM "PromptAnalysis";
DROP TABLE "PromptAnalysis";
ALTER TABLE "new_PromptAnalysis" RENAME TO "PromptAnalysis";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
