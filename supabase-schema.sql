-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('FREE', 'CREATOR', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'UPLOADING', 'PROCESSING', 'COMPLETED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JobStage" AS ENUM ('STT', 'MT', 'TTS', 'MUXING', 'LIPSYNC');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "passwordHash" TEXT,
    "is_beta_tester" BOOLEAN NOT NULL DEFAULT false,
    "beta_invite_code" TEXT,
    "beta_onboarded_at" TIMESTAMP(3),
    "subscription_tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "subscription_status" TEXT,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "processing_minutes_used" INTEGER NOT NULL DEFAULT 0,
    "processing_minutes_limit" INTEGER NOT NULL DEFAULT 10,
    "voice_clone_slots" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "source_language" TEXT NOT NULL,
    "target_language" TEXT NOT NULL,
    "video_url" TEXT,
    "audio_url" TEXT,
    "output_video_url" TEXT,
    "thumbnail_url" TEXT,
    "duration" DOUBLE PRECISION,
    "voice_config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcripts" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "edited_content" JSONB,
    "confidence" DOUBLE PRECISION,
    "speaker_count" INTEGER,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translations" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "target_language" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "edited_content" JSONB,
    "glossary_applied" BOOLEAN NOT NULL DEFAULT false,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_clones" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sample_audio_url" TEXT NOT NULL,
    "model_data" JSONB NOT NULL,
    "language" TEXT,
    "quality" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_clones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "stage" "JobStage" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "metadata" JSONB,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "glossaries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_language" TEXT NOT NULL,
    "target_language" TEXT NOT NULL,
    "source_term" TEXT NOT NULL,
    "target_term" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "glossaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dubbing_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "original_file" TEXT NOT NULL,
    "output_file" TEXT,
    "source_language" TEXT NOT NULL DEFAULT 'en',
    "target_language" TEXT NOT NULL DEFAULT 'es',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "dubbing_jobs_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_ticket_messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "user_id" TEXT,
    "message" TEXT NOT NULL,
    "is_staff" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abuse_reports" (
    "id" TEXT NOT NULL,
    "reporter_id" TEXT,
    "content_type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "abuse_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT,
    "rating" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "event_type" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "properties" JSONB,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_beta_invite_code_key" ON "users"("beta_invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_customer_id_key" ON "users"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripe_subscription_id_key" ON "users"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "transcripts_project_id_idx" ON "transcripts"("project_id");

-- CreateIndex
CREATE INDEX "translations_project_id_idx" ON "translations"("project_id");

-- CreateIndex
CREATE INDEX "voice_clones_user_id_idx" ON "voice_clones"("user_id");

-- CreateIndex
CREATE INDEX "jobs_project_id_idx" ON "jobs"("project_id");

-- CreateIndex
CREATE INDEX "jobs_stage_idx" ON "jobs"("stage");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "glossaries_user_id_idx" ON "glossaries"("user_id");

-- CreateIndex
CREATE INDEX "glossaries_source_language_target_language_idx" ON "glossaries"("source_language", "target_language");

-- CreateIndex
CREATE INDEX "dubbing_jobs_user_id_idx" ON "dubbing_jobs"("user_id");

-- CreateIndex
CREATE INDEX "dubbing_jobs_status_idx" ON "dubbing_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "context_maps_project_id_key" ON "context_maps"("project_id");

-- CreateIndex
CREATE INDEX "context_maps_project_id_idx" ON "context_maps"("project_id");

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

-- CreateIndex
CREATE INDEX "support_tickets_user_id_idx" ON "support_tickets"("user_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- CreateIndex
CREATE INDEX "support_ticket_messages_ticket_id_idx" ON "support_ticket_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "abuse_reports_content_type_content_id_idx" ON "abuse_reports"("content_type", "content_id");

-- CreateIndex
CREATE INDEX "abuse_reports_status_idx" ON "abuse_reports"("status");

-- CreateIndex
CREATE INDEX "feedback_user_id_idx" ON "feedback"("user_id");

-- CreateIndex
CREATE INDEX "feedback_status_idx" ON "feedback"("status");

-- CreateIndex
CREATE INDEX "feedback_type_idx" ON "feedback"("type");

-- CreateIndex
CREATE INDEX "analytics_events_user_id_idx" ON "analytics_events"("user_id");

-- CreateIndex
CREATE INDEX "analytics_events_event_type_idx" ON "analytics_events"("event_type");

-- CreateIndex
CREATE INDEX "analytics_events_event_name_idx" ON "analytics_events"("event_name");

-- CreateIndex
CREATE INDEX "analytics_events_created_at_idx" ON "analytics_events"("created_at");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translations" ADD CONSTRAINT "translations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_clones" ADD CONSTRAINT "voice_clones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "glossaries" ADD CONSTRAINT "glossaries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dubbing_jobs" ADD CONSTRAINT "dubbing_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_maps" ADD CONSTRAINT "context_maps_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "dubbing_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

