# Deployment Instructions

## ✅ Your Platform is Ready to Deploy!

All code has been rebuilt and is ready for deployment to:
- **Backend + Workers**: Render
- **Frontend**: Vercel  
- **Database**: Supabase

---

## Quick Deploy (30 minutes)

### 1. Setup Services

**Supabase** (5 min)
- Create project at supabase.com
- Run `supabase-schema.sql` in SQL Editor
- Copy connection string

**Upstash Redis** (3 min)
- Create database at upstash.com
- Copy host, port, password

**AWS S3** (5 min)
- Create bucket
- Create IAM user
- Get access keys

**OpenAI** (2 min)
- Get API key from platform.openai.com

### 2. Deploy Backend (Render)

```bash
# Build command:
cd packages/backend && npm install && npx prisma generate && npm run build

# Start command:
cd packages/backend && node dist/index.js
```

**Environment Variables**:
```
NODE_ENV=production
PORT=8080
DATABASE_URL=<supabase-url>
REDIS_HOST=<upstash-host>
REDIS_PORT=6379
REDIS_PASSWORD=<upstash-password>
JWT_SECRET=<random-32-chars>
OPENAI_API_KEY=<openai-key>
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
AWS_REGION=us-east-1
S3_BUCKET=<bucket-name>
FRONTEND_URL=<vercel-url>
```

### 3. Deploy Workers (Render)

```bash
# Build command:
cd packages/workers && npm install && npm run build

# Start command:
cd packages/workers && node dist/index.js
```

**Environment Variables**:
```
NODE_ENV=production
DATABASE_URL=<supabase-url>
REDIS_HOST=<upstash-host>
REDIS_PORT=6379
REDIS_PASSWORD=<upstash-password>
OPENAI_API_KEY=<openai-key>
```

### 4. Deploy Frontend (Vercel)

```bash
# Root directory: packages/frontend
# Build command: npm run build
```

**Environment Variable**:
```
NEXT_PUBLIC_API_URL=<render-backend-url>/api
```

### 5. Update & Test

1. Update `FRONTEND_URL` in Render backend
2. Redeploy backend
3. Test at your Vercel URL

---

## Detailed Guides

- **Complete Guide**: `DEPLOYMENT_GUIDE.md` (full documentation)
- **Checklist**: `DEPLOY_CHECKLIST.md` (step-by-step)
- **Quick Guide**: `QUICK_DEPLOY.md` (30-minute version)
- **Ready Check**: `DEPLOYMENT_READY.md` (verification)

---

## Build Verification

All builds pass:
```bash
✅ Backend builds successfully
✅ Workers build successfully  
✅ Frontend builds successfully
```

---

## Cost

- Render Backend: $7/month
- Render Workers: $7/month
- Vercel: Free
- Supabase: Free (up to 500MB)
- Upstash: Free (10K commands/day)
- AWS S3: ~$1-5/month

**Total: ~$15-20/month**

---

## Support

Need help? Check:
1. Service logs (Render/Vercel)
2. Environment variables
3. Connection strings
4. API keys

Full documentation in `DEPLOYMENT_GUIDE.md`

---

**Ready to deploy? Follow `DEPLOY_CHECKLIST.md` for step-by-step instructions.**
