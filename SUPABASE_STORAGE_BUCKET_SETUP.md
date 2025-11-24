# Create Supabase Storage Bucket

## Quick Fix

Your app needs a storage bucket called `videos` in Supabase.

### Option 1: Create via Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **New bucket**
5. Enter:
   - Name: `videos`
   - Public bucket: **YES** (toggle on)
   - File size limit: 500 MB
6. Click **Create bucket**

### Option 2: Create via SQL

Run this in Supabase SQL Editor:

```sql
-- Create the videos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('videos', 'videos', true, 524288000)
ON CONFLICT (id) DO NOTHING;

-- Set up policies to allow public access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'videos' );

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'videos' );

CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'videos' );

CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
USING ( bucket_id = 'videos' );
```

### Verify

After creating the bucket:
1. Go back to your app
2. Try uploading a video to a project
3. It should work now!

## What This Bucket Is For

The `videos` bucket stores:
- Original uploaded videos
- Processed/dubbed videos
- Audio files extracted from videos
- Thumbnails

All files are publicly accessible via URL.
