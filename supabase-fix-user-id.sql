-- Fix projects table to auto-generate IDs and allow nullable user_id
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add default UUID generation for id column
ALTER TABLE "projects" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- Make user_id nullable
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_user_id_fkey";
ALTER TABLE "projects" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "projects" 
ADD CONSTRAINT "projects_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Fix other tables that might have the same issue
ALTER TABLE "dubbing_jobs" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "dubbing_jobs" DROP CONSTRAINT IF EXISTS "dubbing_jobs_user_id_fkey";
ALTER TABLE "dubbing_jobs" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "dubbing_jobs" 
ADD CONSTRAINT "dubbing_jobs_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Fix all other tables to have UUID defaults
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "transcripts" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "translations" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "voice_clones" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "jobs" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "glossaries" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "context_maps" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "adaptation_metrics" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "audio_quality_metrics" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "sync_quality_metrics" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "support_tickets" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "support_ticket_messages" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "abuse_reports" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "feedback" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
ALTER TABLE "analytics_events" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- Verify the changes
SELECT 
    table_name,
    column_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name IN ('id', 'user_id');
