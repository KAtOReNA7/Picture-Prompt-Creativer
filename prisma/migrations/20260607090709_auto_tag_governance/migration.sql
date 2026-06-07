-- CreateTable
CREATE TABLE "TagGovernanceRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sourceTagCount" INTEGER NOT NULL,
    "targetTagCount" INTEGER,
    "archivedTagCount" INTEGER NOT NULL DEFAULT 0,
    "movedRelationsCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "rawPlanJson" TEXT,
    "resultJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME
);
