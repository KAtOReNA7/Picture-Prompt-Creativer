-- CreateTable
CREATE TABLE "GeneratedImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "model" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "quality" TEXT,
    "format" TEXT,
    "filename" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "publicPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
