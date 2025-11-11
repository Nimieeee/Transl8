# 🚀 Transl8 - Quick Deployment Guide

## What is Transl8?

Transl8 is an AI-powered video dubbing platform that translates and dubs videos into 10 languages with perfect lip-sync timing.

## Deployment Stack

- **Frontend**: Vercel (Next.js)
- **Backend + Workers**: Render (Node.js + Express)
- **Database**: Supabase (PostgreSQL)
- **Redis**: Upstash
- **Storage**: Local (or AWS S3 for production)

---

## 🎯 Quick Deploy (5 Minutes)

### 1. Database (Supabase)

```bash
# 1. Create project at https://supabase.com
# 2. Copy connection string from Settings → Database
# 3. Run migrations:

cd packages/backend
export DATABASE_URL="your_supabase_url"
npx prisma migrate deploy
npx prisma generate
```

### 2. Redis (Upstash)

```bash
# 1. Create database at https://upstash.com
# 2. Copy REDIS_URL
```

### 3. Backend (Render)

```bash
# 1. Push code to GitHub
# 2. Go to https://render.com
# 3. New Web Service → Connect repo
# 4. Settings:
#    - Root Directory: packages/backend
#    - Build: npm install && npx prisma generate && npm run build
#    - Start: npm start
# 5. Add environment variables (see below)
# 6. Deploy!
```

**Environment Variables for Render:**
```
DATABASE_URL=your_supabase_url
REDIS_URL=your_upstash_url
OPENAI_API_KEY=sk-...
MISTRAL_API_KEY=...
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-app.vercel.app
WORKER_CONCURRENCY=2
```

### 4. Workers (Render)

**Option A: Same instance as backend** (Recommended for MVP)
- Workers run automatically with backend
- No additional cost

**Option B: Separate worker instance**
- Create another Render service
- Root Directory: `packages/workers`
- Build: `npm install && npm run build`
- Start: `npm start`
- Add same environment variables

### 5. Frontend (Vercel)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd packages/frontend
vercel --prod

# Set environment variable in Vercel dashboard:
# NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

---

## 🔧 Configuration Files

All configuration files are ready:

- ✅ `vercel.json` - Vercel config
- ✅ `render.yaml` - Render config
- ✅ `.env.example` - Environment variables template
- ✅ `deploy.sh` - Interactive deployment script
- ✅ `Procfile` - Process configuration

---

## 📋 Environment Variables Checklist

### Required

- [ ] `DATABASE_URL` - Supabase PostgreSQL connection string
- [ ] `REDIS_URL` - Upstash Redis connection string
- [ ] `OPENAI_API_KEY` - OpenAI API key (for Whisper + TTS)
- [ ] `MISTRAL_API_KEY` - Mistral AI API key (for translation)
- [ ] `FRONTEND_URL` - Your Vercel frontend URL

### Optional

- [ ] `AWS_ACCESS_KEY_ID` - For S3 storage (production)
- [ ] `AWS_SECRET_ACCESS_KEY` - For S3 storage
- [ ] `AWS_S3_BUCKET` - S3 bucket name
- [ ] `SENTRY_DSN` - Error tracking

---

## 🧪 Test Deployment

After deployment, test the full pipeline:

```bash
# 1. Open your Vercel URL
# 2. Upload a test video
# 3. Select target language
# 4. Wait for processing
# 5. Download dubbed video
```

---

## 💰 Cost Breakdown

### Free Tier (Testing)

- Vercel: Free (Hobby)
- Render: $0 (Free tier, limited hours)
- Supabase: Free (500MB database)
- Upstash: Free (10K commands/day)
- **Total**: $0/month + API costs

### Production Tier

- Vercel: $0 (Hobby) or $20 (Pro)
- Render: $7-14 (Starter)
- Supabase: $25 (Pro)
- Upstash: $10 (Pay-as-you-go)
- **Total**: $42-69/month + API costs

### API Costs (per video)

- OpenAI Whisper: ~$0.006/minute
- OpenAI TTS: ~$0.015/1K characters
- Mistral AI: ~$0.001/1K tokens
- **Average**: $0.10-0.50 per video

---

## 🔒 Security Checklist

Before going live:

- [ ] All API keys in environment variables (not in code)
- [ ] CORS configured with your domain
- [ ] HTTPS enforced (automatic on Vercel/Render)
- [ ] Rate limiting enabled
- [ ] File upload size limits set
- [ ] Input validation in place
- [ ] Error tracking configured

---

## 📊 Monitoring

### Render Dashboard
- View logs in real-time
- Monitor CPU/memory usage
- Set up alerts

### Vercel Analytics
- Enable in project settings
- Track page views and performance

### Supabase Dashboard
- Monitor database queries
- Check connection pool usage
- View slow queries

---

## 🆘 Troubleshooting

### Backend won't start
- Check Render logs
- Verify DATABASE_URL is correct
- Ensure Prisma migrations ran

### Workers not processing
- Check REDIS_URL connection
- Verify API keys are set
- Check worker logs in Render

### Frontend can't connect to backend
- Verify NEXT_PUBLIC_API_URL is correct
- Check CORS configuration
- Ensure backend is running

### Database connection errors
- Check Supabase connection string
- Verify IP allowlist (Supabase allows all by default)
- Check connection pool limits

---

## 🎉 You're Ready!

Your Transl8 platform is ready to deploy. Follow the steps above and you'll be dubbing videos in production in minutes!

**Need help?** Check the full DEPLOYMENT_GUIDE.md for detailed instructions.
