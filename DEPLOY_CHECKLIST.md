# Deployment Checklist

Quick checklist to deploy to Render + Vercel + Supabase.

## Pre-Deployment

- [ ] Code is pushed to GitHub
- [ ] All builds pass locally
- [ ] Environment variables are documented

## 1. Supabase Setup (5 minutes)

- [ ] Create Supabase project
- [ ] Set database password (save it!)
- [ ] Run `supabase-schema.sql` in SQL Editor
- [ ] Copy connection string (Transaction mode)
- [ ] Format: `postgresql://postgres.xxx:[PASSWORD]@...pooler.supabase.com:6543/postgres?pgbouncer=true`

## 2. Upstash Redis Setup (3 minutes)

- [ ] Create Upstash account
- [ ] Create new Redis database
- [ ] Copy connection details:
  - REDIS_HOST: `xxx.upstash.io`
  - REDIS_PORT: `6379`
  - REDIS_PASSWORD: (from dashboard)

## 3. AWS S3 Setup (5 minutes)

- [ ] Create S3 bucket (e.g., `transl8-videos`)
- [ ] Uncheck "Block all public access"
- [ ] Create IAM user with S3 access
- [ ] Save Access Key ID and Secret Access Key
- [ ] Add CORS policy to bucket

## 4. Get API Keys (2 minutes)

- [ ] OpenAI API key from https://platform.openai.com/api-keys
- [ ] Generate JWT secret (32+ random characters)

## 5. Deploy Backend to Render (10 minutes)

- [ ] Go to Render.com → New Web Service
- [ ] Connect GitHub repository
- [ ] Configure:
  - Name: `transl8-backend`
  - Build: `cd packages/backend && npm install && npx prisma generate && npm run build`
  - Start: `cd packages/backend && node dist/index.js`
  - Plan: Starter

- [ ] Add environment variables:
```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=<supabase-connection-string>
REDIS_HOST=<upstash-host>
REDIS_PORT=6379
REDIS_PASSWORD=<upstash-password>
JWT_SECRET=<random-32-char-string>
OPENAI_API_KEY=<openai-key>
AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
AWS_REGION=us-east-1
S3_BUCKET=<your-bucket-name>
FRONTEND_URL=https://your-app.vercel.app
```

- [ ] Deploy and wait
- [ ] Test: `curl https://transl8-backend.onrender.com/health`

## 6. Deploy Workers to Render (5 minutes)

- [ ] Go to Render.com → New Background Worker
- [ ] Connect same repository
- [ ] Configure:
  - Name: `transl8-workers`
  - Build: `cd packages/workers && npm install && npm run build`
  - Start: `cd packages/workers && node dist/index.js`
  - Plan: Starter

- [ ] Add environment variables:
```bash
NODE_ENV=production
DATABASE_URL=<supabase-connection-string>
REDIS_HOST=<upstash-host>
REDIS_PORT=6379
REDIS_PASSWORD=<upstash-password>
OPENAI_API_KEY=<openai-key>
```

- [ ] Deploy and check logs

## 7. Deploy Frontend to Vercel (5 minutes)

- [ ] Go to Vercel.com → New Project
- [ ] Import GitHub repository
- [ ] Configure:
  - Framework: Next.js
  - Root Directory: `packages/frontend`
  - Build Command: `npm run build`

- [ ] Add environment variable:
```bash
NEXT_PUBLIC_API_URL=https://transl8-backend.onrender.com/api
```

- [ ] Deploy
- [ ] Copy Vercel URL

## 8. Update Backend FRONTEND_URL (2 minutes)

- [ ] Go back to Render backend service
- [ ] Update `FRONTEND_URL` to your Vercel URL
- [ ] Redeploy backend

## 9. Test Everything (5 minutes)

- [ ] Open Vercel URL
- [ ] Sign up with test account
- [ ] Create a project
- [ ] Upload a small video
- [ ] Check Render logs for processing
- [ ] Verify video processes successfully

## 10. Post-Deployment

- [ ] Set up custom domains (optional)
- [ ] Configure monitoring
- [ ] Set up backups
- [ ] Document any issues

---

## Quick Reference

### Backend URL
`https://transl8-backend.onrender.com`

### Frontend URL
`https://your-app.vercel.app`

### Database
Supabase Dashboard → Your Project

### Redis
Upstash Dashboard → Your Database

### Storage
AWS S3 Console → Your Bucket

---

## Troubleshooting

### Backend won't start
- Check Render logs
- Verify DATABASE_URL format
- Test Redis connection

### Workers not processing
- Check worker logs
- Verify OPENAI_API_KEY
- Check Redis connection

### Frontend can't connect
- Verify NEXT_PUBLIC_API_URL
- Check CORS (FRONTEND_URL in backend)
- Check backend is running

---

## Costs

- Render Backend: $7/month
- Render Workers: $7/month
- Vercel: Free
- Supabase: Free (up to 500MB)
- Upstash: Free (10K commands/day)
- AWS S3: ~$1-5/month

**Total: ~$15-20/month**

---

## Support

Full guide: `DEPLOYMENT_GUIDE.md`

Need help? Check:
- Render logs
- Vercel deployment logs
- Supabase logs
- Browser console
