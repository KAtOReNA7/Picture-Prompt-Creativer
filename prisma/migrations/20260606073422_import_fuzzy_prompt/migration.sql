-- AlterTable
ALTER TABLE "PromptAnalysis" ADD COLUMN "importMode" TEXT;
ALTER TABLE "PromptAnalysis" ADD COLUMN "importedPromptLanguage" TEXT;
ALTER TABLE "PromptAnalysis" ADD COLUMN "importedRawPrompt" TEXT;
