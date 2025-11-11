-- AlterTable
ALTER TABLE "dubbing_jobs" ALTER COLUMN "user_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "context_maps" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "original_duration_ms" INTEGER NOT NULL,
    "source_language" TEXT NOT NULL,
    "target_language" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_maps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "context_maps_project_id_key" ON "context_maps"("project_id");

-- CreateIndex
CREATE INDEX "context_maps_project_id_idx" ON "context_maps"("project_id");

-- AddForeignKey
ALTER TABLE "context_maps" ADD CONSTRAINT "context_maps_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "dubbing_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
