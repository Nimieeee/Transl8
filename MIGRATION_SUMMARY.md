# Migration Summary: Prisma → Supabase

## What Changed

### Removed
- ❌ Prisma Client
- ❌ Prisma Schema
- ❌ Prisma migrations
- ❌ `npx prisma generate` from build commands
- ❌ AWS S3 (using Supabase Storage instead)

### Added
- ✅ Supabase JS Client
- ✅ Direct SQL schema (`supabase-schema.sql`)
- ✅ Supabase Storage for files
- ✅ Simplified deployment

## Files Modified

### Backend
- `packages/backend/src/lib/supabase.ts` - New Supabase client
- `packages/backend/src/routes/auth.ts` - Uses Supabase
- `packages/backend/src/routes/projects.ts` - Uses Supabase
- `packages/backend/src/routes/dub.ts` - Uses Supabase

### Workers
- `packages/workers/src/lib/supabase.ts` - New Supabase client
- `packages/workers/src/stt-worker.ts` - Uses Supabase
- `packages/workers/src/translation-worker.ts` - Uses Supabase
- `packages/workers/src/tts-worker.ts` - Uses Supabase
- `packages/workers/src/muxing-worker.ts` - Uses Supabase

### Config
- `render.yaml` - Updated build commands, removed Prisma
- `.env.supabase.example` - New env template

## Database Field Name Changes

Supabase uses snake_case, Prisma used camelCase:

| Prisma | Supabase |
|--------|----------|
| `userId` | `user_id` |
| `projectId` | `project_id` |
| `videoUrl` | `video_url` |
| `audioUrl` | `audio_url` |
| `sourceLanguage` | `source_language` |
| `targetLanguage` | `target_language` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `errorMessage` | `error_message` |

## Environment Variables

### Old (Prisma)
```bash
DATABASE_URL=postgresql://...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=...
```

### New (Supabase)
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=...
```

## Deployment Changes

### Old Build Command
```bash
cd packages/backend && npm install && npx prisma generate && npm run build
```

### New Build Command
```bash
cd packages/backend && npm install && npm run build
```

No more Prisma generate step!

## Benefits

1. **Simpler**: No ORM, direct SQL
2. **Cheaper**: Supabase free tier includes storage
3. **Faster**: No Prisma generation step
4. **Unified**: Database + Storage in one place
5. **Better DX**: Supabase dashboard for data management

## Migration Steps

If you have existing data in Prisma/Postgres:

1. Export data from old database
2. Run `supabase-schema.sql` in new Supabase project
3. Import data (adjust field names to snake_case)
4. Update environment variables
5. Deploy

## Testing

After migration, test:

1. ✅ User registration/login
2. ✅ Project creation
3. ✅ Video upload
4. ✅ Job processing
5. ✅ File storage

## Rollback Plan

If you need to go back to Prisma:

1. Restore `packages/backend/prisma/schema.prisma`
2. Restore old route files from git
3. Run `npm install @prisma/client prisma`
4. Run `npx prisma generate`
5. Update environment variables

## Next Steps

1. Follow `DEPLOY_SUPABASE_RENDER.md` for deployment
2. Test thoroughly in development first
3. Monitor Supabase usage in dashboard
4. Set up backups (Supabase has daily backups on free tier)

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Upstash Docs: https://docs.upstash.com
- Render Docs: https://render.com/docs
