# Quick Deploy - 30 Minutes

Deploy your platform in 30 minutes.

## 1. Supabase (5 min)

```bash
# 1. Create project at supabase.com
# 2. Run supabase-schema.sql in SQL Editor
# 3. Copy connection string (Transaction mode)
```

**Save**: `DATABASE_URL`

## 2. Upstash Redis (3 min)

```bash
# 1. Create database at upstash.com
# 2. Copy connection details
```

**Save**: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

## 3. AWS S3 (5 min)

```bash
# 1. Create bucket in AWS Console
# 2. Create IAM user with S3 access
# 3. Get access keys
```

**Save**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`

## 4. API Keys (2 min)

```bash
# 1. Get OpenAI key: platform.openai.com/api-keys
# 2. Generate JWT secret: openssl rand -base64 32
```

**Save**: `OPENAI_API_KEY`, `JWT_SECRET`

## 5. Deploy Backend (10 min)

**Render.com → New Web Service**

Build: `cd packages/backend && npm install && npx prisma generate && npm run build`
Start: `cd packages/backend && node dist/index.js`

**Environment Variables**:
```
NODE_ENV=production
PORT=8080
DATABASE_URL=<from-supabase>
REDIS_HOST=<from-upstash>
REDIS_PORT=6379
REDIS_PASSWORD=<from-upstash>
JWT_SECRET=<generated>
OPENAI_API_KEY=<from-openai>
AWS_ACCESS_KEY_ID=<from-aws>
AWS_SECRET_ACCESS_KEY=<from-aws>
AWS_REGION=us-east-1
S3_BUCKET=<your-bucket>
FRONTEND_URL=https://your-app.vercel.app
```

## 6. Deploy Workers (5 min)

**Render.com → New Background Worker**

Build: `cd packages/workers && npm install && npm run build`
Start: `cd packages/workers && node dist/index.js`

**Environment Variables**:
```
NODE_ENV=production
DATABASE_URL=<from-supabase>
REDIS_HOST=<from-upstash>
REDIS_PORT=6379
REDIS_PASSWORD=<from-upstash>
OPENAI_API_KEY=<from-openai>
```

## 7. Deploy Frontend (5 min)

**Vercel.com → New Project**

Root: `packages/frontend`

**Environment Variable**:
```
NEXT_PUBLIC_API_URL=https://transl8-backend.onrender.com/api
```

## 8. Update & Test (5 min)

1. Update `FRONTEND_URL` in Render backend
2. Redeploy backend
3. Test: Open Vercel URL
4. Sign up and create project

---

## Done! 🎉

Your platform is live at:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://transl8-backend.onrender.com`

**Cost**: ~$15-20/month

**Full Guide**: See `DEPLOYMENT_GUIDE.md`
