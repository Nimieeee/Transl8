# 🚀 Deploy Now - Quick Reference

## 1. Get Credentials (15 min)

### Supabase
```
1. supabase.com → New Project
2. SQL Editor → Run supabase-schema.sql
3. Settings → Database → Copy connection string
```
**Save**: `DATABASE_URL`

### Upstash
```
1. upstash.com → New Redis Database
2. Copy: host, port, password
```
**Save**: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`

### AWS S3
```
1. AWS Console → S3 → Create bucket
2. IAM → Create user → Get keys
```
**Save**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`

### OpenAI
```
1. platform.openai.com/api-keys
2. Create new key
```
**Save**: `OPENAI_API_KEY`

### JWT Secret
```bash
openssl rand -base64 32
```
**Save**: `JWT_SECRET`

---

## 2. Deploy Backend (10 min)

**Render.com → New Web Service**

Build:
```bash
cd packages/backend && npm install && npx prisma generate && npm run build
```

Start:
```bash
cd packages/backend && node dist/index.js
```

Environment Variables:
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

---

## 3. Deploy Workers (5 min)

**Render.com → New Background Worker**

Build:
```bash
cd packages/workers && npm install && npm run build
```

Start:
```bash
cd packages/workers && node dist/index.js
```

Environment Variables:
```
NODE_ENV=production
DATABASE_URL=<from-supabase>
REDIS_HOST=<from-upstash>
REDIS_PORT=6379
REDIS_PASSWORD=<from-upstash>
OPENAI_API_KEY=<from-openai>
```

---

## 4. Deploy Frontend (5 min)

**Vercel.com → New Project**

Root: `packages/frontend`

Environment Variable:
```
NEXT_PUBLIC_API_URL=https://transl8-backend.onrender.com/api
```

---

## 5. Update & Test (5 min)

1. Copy Vercel URL
2. Update `FRONTEND_URL` in Render backend
3. Redeploy backend
4. Test: Open Vercel URL
5. Sign up and create project

---

## URLs

- Backend: `https://transl8-backend.onrender.com`
- Frontend: `https://your-app.vercel.app`
- Health: `https://transl8-backend.onrender.com/health`

---

## Cost

$15-20/month total

---

## Help

Full guide: `DEPLOYMENT_GUIDE.md`
Checklist: `DEPLOY_CHECKLIST.md`
