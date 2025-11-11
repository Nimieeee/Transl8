-- CreateTable
CREATE TABLE "adaptation_metrics" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "language_pair" TEXT NOT NULL,
    "total_segments" INTEGER NOT NULL,
    "successful_segments" INTEGER NOT NULL,
    "failed_segments" INTEGER NOT NULL,
    "success_rate" DOUBLE PRECISION NOT NULL,
    "average_attempts" DOUBLE PRECISION NOT NULL,
    "validation_failure_reasons" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adaptation_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_quality_metrics" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "segment_id" INTEGER NOT NULL,
    "vocal_isolation_snr" DOUBLE PRECISION,
    "spectral_purity" DOUBLE PRECISION,
    "noise_reduction_snr" DOUBLE PRECISION,
    "noise_reduction_db" DOUBLE PRECISION,
    "tts_quality_score" DOUBLE PRECISION,
    "tts_confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audio_quality_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_quality_metrics" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "total_segments" INTEGER NOT NULL,
    "max_drift_ms" DOUBLE PRECISION NOT NULL,
    "average_drift_ms" DOUBLE PRECISION NOT NULL,
    "segment_accuracy" JSONB NOT NULL,
    "sync_quality_score" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_quality_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "adaptation_metrics_project_id_key" ON "adaptation_metrics"("project_id");

-- CreateIndex
CREATE INDEX "adaptation_metrics_language_pair_idx" ON "adaptation_metrics"("language_pair");

-- CreateIndex
CREATE INDEX "adaptation_metrics_created_at_idx" ON "adaptation_metrics"("created_at");

-- CreateIndex
CREATE INDEX "audio_quality_metrics_project_id_idx" ON "audio_quality_metrics"("project_id");

-- CreateIndex
CREATE INDEX "audio_quality_metrics_created_at_idx" ON "audio_quality_metrics"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sync_quality_metrics_project_id_key" ON "sync_quality_metrics"("project_id");

-- CreateIndex
CREATE INDEX "sync_quality_metrics_project_id_idx" ON "sync_quality_metrics"("project_id");

-- CreateIndex
CREATE INDEX "sync_quality_metrics_created_at_idx" ON "sync_quality_metrics"("created_at");
