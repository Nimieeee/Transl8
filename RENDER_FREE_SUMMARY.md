# 🆓 Render Free Tier Deployment - Quick Summary

## ✅ Yes! You can use Render's free tier

Deploy backend + workers together in ONE free web service.

---

## Quick Setup

### 1. Go to Render.com
- New Web Service
- Connect: `Nimieeee/Transl8`

### 2. Configure

**Build Command**:
```bash
npm install && cd packages/backend && npm install && npx prisma generate && npm run build && cd ../workers && npm install && npm run build && cd ../..
```

**Start Command**:
```bash
cd packages/backend && npm run start:with-workers
```

**Plan**: Free

### 3. Add Environment Variables

```
NODE_ENV=production
PORT=8080
DATABASE_URL=<supabase-url>
REDIS_HOST=<upstash-host>
REDIS_PORT=6379
REDIS_PASSWORD=<upstash-password>
JWT_SECRET=<generate-with-openssl>
OPENAI_API_KEY=<your-key>
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_REGION=us-east-1
S3_BUCKET=<your-bucket>
FRONTEND_URL=<vercel-url>
```

### 4. Deploy!

---

## What You Get

✅ Backend + Workers in one service
✅ Completely FREE on Render
✅ Total cost: ~$1/month (just S3)

⚠️ Limitations:
- Spins down after 15 min inactivity
- Cold starts (30-60 seconds)
- 512MB RAM limit

---

## Cost Breakdown

| Service | Cost |
|---------|------|
| Render (Backend + Workers) | **FREE** |
| Vercel (Frontend) | **FREE** |
| Supabase (Database) | **FREE** |
| Upstash (Redis) | **FREE** |
| AWS S3 | ~$1/month |
| **TOTAL** | **~$1/month** 🎉 |

---

## Full Guide

See `RENDER_FREE_DEPLOY.md` for complete instructions!

---

## When to Upgrade

Upgrade to paid ($7/month per service) when:
- ❌ Cold starts are unacceptable
- ❌ Need 24/7 availability
- ❌ Processing many videos
- ❌ Have real users

---

**Perfect for**: Testing, demos, portfolio projects
**Not for**: Production with real users

Next: Deploy frontend to Vercel (also FREE!)
