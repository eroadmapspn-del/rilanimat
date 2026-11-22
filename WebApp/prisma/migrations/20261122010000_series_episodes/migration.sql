-- CreateEnum
CREATE TYPE "EpisodeStage" AS ENUM ('PLANNED', 'SCRIPTING', 'SCRIPT_READY', 'SCRIPT_APPROVED', 'VOICING', 'VOICE_READY', 'VOICE_APPROVED', 'RENDERING', 'DONE', 'FAILED');

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_currentVersionId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectVersion" DROP CONSTRAINT "ProjectVersion_projectId_fkey";

-- DropForeignKey
ALTER TABLE "RenderJob" DROP CONSTRAINT "RenderJob_versionId_fkey";

-- DropIndex
DROP INDEX "Project_currentVersionId_key";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "currentVersionId",
ADD COLUMN     "bible" JSONB,
ADD COLUMN     "episodeCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "prompt" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RenderJob" ADD COLUMN     "episodeId" TEXT NOT NULL;

-- DropTable
DROP TABLE "ProjectVersion";

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "outline" JSONB NOT NULL,
    "stage" "EpisodeStage" NOT NULL DEFAULT 'PLANNED',
    "story" JSONB,
    "voice" JSONB,
    "currentVersion" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpisodeVersion" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "story" JSONB NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EpisodeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Episode_userId_idx" ON "Episode"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_projectId_number_key" ON "Episode"("projectId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeVersion_episodeId_number_key" ON "EpisodeVersion"("episodeId", "number");

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeVersion" ADD CONSTRAINT "EpisodeVersion_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderJob" ADD CONSTRAINT "RenderJob_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RenderJob" ADD CONSTRAINT "RenderJob_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "EpisodeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

