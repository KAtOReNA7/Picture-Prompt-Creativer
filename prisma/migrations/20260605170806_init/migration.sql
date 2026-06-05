-- CreateTable
CREATE TABLE "ImageAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "localPath" TEXT NOT NULL,
    "publicPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PromptAnalysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "imageId" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "PromptSegment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isReplaceable" BOOLEAN NOT NULL DEFAULT false,
    "replaceHint" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptSegment_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "PromptAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptFusion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "userRequirement" TEXT NOT NULL,
    "fusedPrompt" TEXT NOT NULL,
    "changeSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptFusion_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "PromptAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
