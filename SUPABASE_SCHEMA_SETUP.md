# Supabase Database Schema Setup

Complete guide to set up your database schema in Supabase.

---

## 📋 What You Need

- Supabase account (free)
- The schema file: `supabase-schema.sql`

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Open SQL Editor

1. Go to your Supabase project dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**

### Step 2: Copy Schema

Open the file `supabase-schema.sql` in your repository and copy ALL the content.

Or use this command to view it:
```bash
cat supabase-schema.sql
```

### Step 3: Paste and Run

1. Paste the entire schema into the SQL Editor
2. Click **"Run"** (or press Ctrl/Cmd + Enter)
3. Wait for completion (~10 seconds)
4. You should see: **"Success. No rows returned"**

### Step 4: Verify Tables

1. Click **"Table Editor"** in the left sidebar
2. You should see these tables:
   - users
   - projects
   - transcripts
   - translations
   - voice_clones
   - jobs
   - glossaries
   - dubbing_jobs
   - context_maps
   - adaptation_metrics
   - audio_quality_metrics
   - sync_quality_metrics
   - support_tickets
   - support_ticket_messages
   - abuse_reports
   - feedback
   - analytics_events

---

## 📊 Database Schema Overview

### Core Tables

**users**
- User accounts and authentication
- Subscription management
- Usage tracking

**projects**
- Video dubbing projects
- Source/target languages
- Video URLs and status

**transcripts**
- Speech-to-text results
- Confidence scores
- Speaker detection

**translations**
- Translated content
- Glossary application
- Approval status

**jobs**
- Pipeline job tracking
- Progress monitoring
- Error handling

### Supporting Tables

**voice_clones**
- Custom voice models
- Sample audio storage

**glossaries**
- Custom terminology
- Translation preferences

**support_tickets**
- User support requests
- Ticket messages

**feedback**
- User feedback
- Feature requests

**analytics_events**
- Usage analytics
- Event tracking

---

## 🔍 Schema Details

### Key Features

✅ **Enums**: Predefined status values
✅ **Indexes**: Fast queries on common fields
✅ **Foreign Keys**: Data integrity
✅ **Cascading Deletes**: Automatic cleanup
✅ **Timestamps**: Created/updated tracking

### Enums Created

```sql
SubscriptionTier: FREE, CREATOR, PRO, ENTERPRISE
ProjectStatus: DRAFT, UPLOADING, PROCESSING, COMPLETED, FAILED, ARCHIVED
JobStage: STT, MT, TTS, MUXING, LIPSYNC
JobStatus: PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
```

---

## ✅ Verification

### Check Tables Exist

Run this query in SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see 17 tables.

### Check Indexes

Run this query:
```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

You should see multiple indexes for performance.

---

## 🔄 If You Need to Reset

### Drop All Tables

⚠️ **Warning**: This deletes ALL data!

```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

Then run the schema again.

---

## 🆘 Troubleshooting

### Error: "relation already exists"

**Solution**: Tables already exist. Either:
1. Drop tables first (see reset above)
2. Or skip this step if tables are correct

### Error: "permission denied"

**Solution**: Make sure you're using the project owner account

### Error: "syntax error"

**Solution**: 
1. Make sure you copied the ENTIRE schema
2. Check for any missing characters
3. Try copying again

---

## 📝 Schema File Location

The complete schema is in your repository:
```
supabase-schema.sql
```

You can also view it on GitHub:
```
https://github.com/Nimieeee/Transl8/blob/main/supabase-schema.sql
```

---

## 🔗 Get Connection String

After schema is set up:

1. Go to **Settings** → **Database**
2. Find **Connection string**
3. Select **Transaction mode** (important!)
4. Copy the string
5. Replace `[YOUR-PASSWORD]` with your database password

Example:
```
postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

This is your `DATABASE_URL` for Render!

---

## 📖 Related Guides

- `RENDER_ENV_VARIABLES.md` - Environment variables
- `SUPABASE_STORAGE_SETUP.md` - Storage setup
- `FREE_DEPLOYMENT_COMPLETE.md` - Complete deployment

---

## Summary

✅ **Time**: 5 minutes
✅ **Tables**: 17 created
✅ **Indexes**: Automatically created
✅ **Ready**: For deployment

Next: Set up Supabase Storage! 🚀
