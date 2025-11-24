-- Make user_id nullable in projects table
ALTER TABLE "projects" ALTER COLUMN "user_id" DROP NOT NULL;

-- Drop foreign key constraint if it exists
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_user_id_fkey";

-- Make user_id nullable in other tables that reference users
ALTER TABLE "dubbing_jobs" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "dubbing_jobs" DROP CONSTRAINT IF EXISTS "dubbing_jobs_user_id_fkey";
