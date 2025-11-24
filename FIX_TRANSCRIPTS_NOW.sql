-- URGENT: Fix transcripts table timestamp defaults
-- Run this in Supabase SQL Editor NOW

-- Add default timestamps for transcripts table
ALTER TABLE "transcripts" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "transcripts" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

-- Verify the fix
SELECT 
    table_name,
    column_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'transcripts'
AND column_name IN ('created_at', 'updated_at');
