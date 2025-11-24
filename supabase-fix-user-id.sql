-- Make user_id nullable in projects table to allow anonymous project creation
-- Run this in your Supabase SQL Editor

-- First, drop the foreign key constraint
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_user_id_fkey";

-- Make user_id nullable
ALTER TABLE "projects" ALTER COLUMN "user_id" DROP NOT NULL;

-- Re-add the foreign key constraint with nullable support
ALTER TABLE "projects" 
ADD CONSTRAINT "projects_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Also make user_id nullable in dubbing_jobs for consistency
ALTER TABLE "dubbing_jobs" DROP CONSTRAINT IF EXISTS "dubbing_jobs_user_id_fkey";
ALTER TABLE "dubbing_jobs" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "dubbing_jobs" 
ADD CONSTRAINT "dubbing_jobs_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Verify the changes
SELECT 
    table_name,
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name IN ('projects', 'dubbing_jobs')
AND column_name = 'user_id';
