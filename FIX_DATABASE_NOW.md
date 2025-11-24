# URGENT: Fix Database Schema

## The Problem
Your backend is failing because the `projects` table requires a `user_id`, but you're trying to insert `null` (for anonymous users).

## The Solution
Run this SQL in your Supabase dashboard to make `user_id` nullable.

## Steps to Fix

### 1. Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New query**

### 2. Copy and Paste This SQL

```sql
-- Make user_id nullable in projects table
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_user_id_fkey";
ALTER TABLE "projects" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "projects" 
ADD CONSTRAINT "projects_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;

-- Also fix dubbing_jobs
ALTER TABLE "dubbing_jobs" DROP CONSTRAINT IF EXISTS "dubbing_jobs_user_id_fkey";
ALTER TABLE "dubbing_jobs" ALTER COLUMN "user_id" DROP NOT NULL;
ALTER TABLE "dubbing_jobs" 
ADD CONSTRAINT "dubbing_jobs_user_id_fkey" 
FOREIGN KEY ("user_id") REFERENCES "users"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;
```

### 3. Click "Run" (or press Cmd/Ctrl + Enter)

### 4. Verify Success
You should see a success message. The query will return information about the columns.

### 5. Test Your App
After running the SQL:
1. Go back to your frontend: https://transl8-frontend.vercel.app
2. Try creating a new project
3. It should work now!

## Alternative: Quick Test
If you want to test before fixing, you can temporarily create a dummy user:

```sql
-- Create a test user (only if you want to test without making user_id nullable)
INSERT INTO users (id, email, password, created_at, updated_at)
VALUES ('test-user-id', 'test@example.com', 'dummy', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
```

Then update your backend code to use this user ID instead of null. But the better solution is to make user_id nullable as shown above.

## After the Fix
Once you've run the SQL migration, your app should work immediately - no need to redeploy!
