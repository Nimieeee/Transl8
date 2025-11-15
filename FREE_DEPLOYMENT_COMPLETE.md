# 🎉 100% FREE Deployment Guide

Deploy your entire video dubbing platform for **$0/month**!

---

## ✅ All Services Are FREE

| Service | What It Does | Cost |
|---------|--------------|------|
| **Render** | Backend + Workers | FREE |
| **Vercel** | Frontend | FREE |
| **Supabase** | Database + Storage | FREE |
| **Upstash** | Redis Queue | FREE |
| **TOTAL** | | **$0/month** 🎉 |

---

## Quick Setup (30 minutes)

### 1. Supabase Setup (10 min)

**Database**:
1. Create project at supabase.com
2. Run `supabase-schema.sql` in SQL Editor
3. Copy DATABASE_URL

**Storage**:
1. Go to Storage → New bucket
2. Name: `videos`, Public: ✅
3. Copy SUPABASE_URL and SUPABASE_SERVICE_KEY

📖 Full guide: `SUPABASE_STORAGE_SETUP.md`

### 2. Upstash Redis (3 min)

1. Create database at upstash.com
2. Copy: HOST, PORT, PASSWORD

### 3. OpenAI API (2 min)

1. Get key from platform.openai.com
2. Pay-as-you-go (~$0.10 per video)

### 4. Deploy Backend + Workers (10 min)

**Render.com** → New Web Service

**Build**:
```bash
npm install && cd packages/backend && npm install && npx prisma generate && npm run build && cd ../workers && npm install && npm run build && cd ../..
```

**Start**:
```bash
cd packages/backend && npm run start:with-workers
```

**Plan**: FREE

**Environment Variables** (9 total):
```
NODE_ENV=production
PORT=8080
DATABASE_URL=<supabase>
REDIS_HOST=<upstash>
REDIS_PORT=6379
REDIS_PASSWORD=<upstash>
JWT_SECRET=<generate>
OPENAI_API_KEY=<openai>
SUPABASE_URL=<supabase>
SUPABASE_SERVICE_KEY=<supabase>
FRONTEND_URL=<vercel-url>
```

📖 Full guide: `RENDER_FREE_DEPLOY.md`

### 5. Deploy Frontend (5 min)

**Vercel.com** → New Project

- Root: `packages/frontend`
- Environment: `NEXT_PUBLIC_API_URL=<render-url>/api`
- Plan: FREE

📖 Full guide: `VERCEL_DEPLOY_STEPS.md`

---

## What You Get

✅ **Full video dubbing platform**
✅ **Speech-to-text** (Whisper)
✅ **Translation** (GPT-4)
✅ **Text-to-speech** (OpenAI TTS)
✅ **Video muxing** (FFmpeg)
✅ **User authentication**
✅ **Project management**
✅ **File storage** (1GB)

---

## Free Tier Limits

### Render (Backend + Workers)
- ⚠️ Spins down after 15 min inactivity
- ⚠️ Cold starts (30-60 seconds)
- ⚠️ 512MB RAM
- ✅ 750 hours/month

### Vercel (Frontend)
- ✅ Unlimited bandwidth
- ✅ 100GB bandwidth/month
- ✅ Automatic SSL
- ✅ Global CDN

### Supabase (Database + Storage)
- ✅ 500MB database
- ✅ 1GB file storage
- ✅ 2GB bandwidth/month
- ✅ Automatic backups

### Upstash (Redis)
- ✅ 10,000 commands/day
- ✅ 256MB storage
- ✅ Global replication

---

## Costs Breakdown

### Completely FREE
- Render web service
- Vercel hosting
- Supabase database
- Supabase storage (1GB)
- Upstash Redis

### Pay-as-you-go
- OpenAI API: ~$0.10 per video
  - Whisper STT: ~$0.006/min
  - GPT-4 Translation: ~$0.03/video
  - TTS: ~$0.015/min

**Example**: 10 videos/month = ~$1/month

---

## When to Upgrade

Consider paid tiers when:

### Render ($7/month per service)
- ❌ Cold starts unacceptable
- ❌ Need 24/7 availability
- ❌ Processing > 20 videos/day

### Supabase ($25/month)
- ❌ Database > 500MB
- ❌ Storage > 1GB
- ❌ Need more bandwidth

### Upstash ($10/month)
- ❌ > 10K commands/day
- ❌ Need more memory

---

## Performance Tips

### Keep Render Warm
Use UptimeRobot (free) to ping every 5 min:
```
https://your-app.onrender.com/health
```

### Optimize Storage
- Compress videos before upload
- Delete old projects
- Use 1GB wisely

### Monitor Usage
- Check Supabase dashboard
- Monitor OpenAI costs
- Watch Render logs

---

## Complete Documentation

### Setup Guides
- `SUPABASE_STORAGE_SETUP.md` - Storage setup
- `RENDER_FREE_DEPLOY.md` - Backend deployment
- `VERCEL_DEPLOY_STEPS.md` - Frontend deployment

### Quick References
- `RENDER_FREE_SUMMARY.md` - Quick overview
- `DEPLOY_NOW.md` - Fast deployment
- `START_HERE.md` - Choose your path

---

## Troubleshooting

### Cold Starts
- Normal on free tier
- First request takes 30-60s
- Use UptimeRobot to prevent

### Out of Memory
- Free tier: 512MB RAM
- Process smaller videos
- Upgrade to paid tier

### Storage Full
- Free tier: 1GB limit
- Delete old files
- Upgrade to paid tier

---

## Success Checklist

- [ ] Supabase project created
- [ ] Database schema applied
- [ ] Storage bucket created
- [ ] Upstash Redis created
- [ ] OpenAI API key obtained
- [ ] Backend deployed on Render
- [ ] Frontend deployed on Vercel
- [ ] Can sign up and login
- [ ] Can create project
- [ ] Can upload video
- [ ] Video processes successfully

---

## Your Platform URLs

After deployment:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-app.onrender.com`
- **API**: `https://your-app.onrender.com/api`
- **Health**: `https://your-app.onrender.com/health`

---

## Summary

🎉 **Total Cost**: $0/month (+ OpenAI usage)

**Perfect for**:
- ✅ Testing and development
- ✅ Portfolio projects
- ✅ Demos and presentations
- ✅ Low-traffic applications
- ✅ Learning and experimentation

**Not suitable for**:
- ❌ High-traffic production
- ❌ Business-critical applications
- ❌ Real-time requirements
- ❌ Large file processing

---

## Next Steps

1. Follow setup guides above
2. Deploy all services
3. Test complete flow
4. Share your project!
5. Upgrade when needed

---

**Congratulations! You now have a fully functional video dubbing platform running for FREE! 🚀**

Questions? Check the detailed guides or ask for help!
