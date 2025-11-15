# Render Free Tier Deployment

Deploy backend + workers in a single free web service on Render.

---

## Why This Approach?

Render's free tier includes:
- ✅ 1 free web service
- ❌ No free background workers

This guide combines backend + workers into one service to use only the free tier.

---

## Prerequisites

Before starting:
- [ ] GitHub account with code pushed
- [ ] Supabase DATABASE_URL (free tier)
- [ ] Upstash Redis credentials (free tier)
- [ ] OpenAI API key (pay-as-you-go)
- [ ] AWS S3 credentials (pay-as-you-go, ~$1/month)
- [ ] JWT secret: `openssl rand -base64 32`

---

## Step 1: Deploy Combined Service

### 1.1 Create New Web Service

1. Go to https://render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account if not already
4. Select repository: **Nimieeee/Transl8**
5. Click **"Connect"**

### 1.2 Configure Service

**Basic Settings:**
- **Name**: `transl8-app`
- **Region**: Oregon (or closest)
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Runtime**: `Node`

**Build & Deploy:**

**Build Command**:
```bash
npm install && cd packages/backend && npm install && npx prisma generate && npm run build && cd ../workers && npm install && npm run build && cd ../..
```

**Start Command**:
```bash
cd packages/backend && npm run start:with-workers
```

**Instance Type:**
- **Plan**: Free

### 1.3 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these:

```bash
NODE_ENV=production
```

```bash
PORT=8080
```

```bash
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

```bash
REDIS_HOST=xxx.upstash.io
```

```bash
REDIS_PORT=6379
```

```bash
REDIS_PASSWORD=your-redis-password
```

```bash
JWT_SECRET=your-random-32-char-secret
```

```bash
OPENAI_API_KEY=sk-proj-your-key
```

```bash
AWS_ACCESS_KEY_ID=your-aws-key
```

```bash
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

```bash
AWS_REGION=us-east-1
```

```bash
S3_BUCKET=transl8-videos
```

```bash
FRONTEND_URL=https://your-app.vercel.app
```

### 1.4 Deploy

1. Click **"Create Web Service"**
2. Wait 5-10 minutes for deployment
3. Watch logs for:
   ```
   Backend server running on port 8080
   ✅ Workers started alongside backend server
   ```

---

## Step 2: Verify Deployment

### Test Health Endpoint

```bash
curl https://transl8-app.onrender.com/health
```

Expected:
```json
{"status":"ok","timestamp":"..."}
```

### Check Logs

In Render dashboard, you should see:
```
Backend server running on port 8080
Starting workers...
✅ Workers started alongside backend server
```

---

## Free Tier Limitations

### Render Free Tier
- ✅ 750 hours/month (enough for 1 service)
- ⚠️ Spins down after 15 minutes of inactivity
- ⚠️ Cold starts take 30-60 seconds
- ⚠️ Limited to 512MB RAM

### What This Means
- First request after inactivity will be slow
- Good for testing/demo
- Not suitable for production traffic
- Consider upgrading to paid tier for real users

---

## Optimization Tips

### 1. Keep Service Warm

Use a service like UptimeRobot to ping your health endpoint every 5 minutes:
```
https://transl8-app.onrender.com/health
```

This prevents cold starts.

### 2. Reduce Memory Usage

The combined service uses more memory. If you hit limits:
- Process smaller videos
- Reduce concurrent workers
- Upgrade to paid tier ($7/month)

### 3. Monitor Performance

Watch Render logs for:
- Memory warnings
- Slow requests
- Worker errors

---

## Troubleshooting

### Service Keeps Crashing

**Error: "Out of memory"**
- Free tier has 512MB RAM limit
- Backend + Workers together use ~400MB
- Solution: Upgrade to Starter plan ($7/month)

**Error: "Workers not processing"**
- Check Redis connection
- Verify OPENAI_API_KEY
- Check logs for specific errors

### Slow Response Times

**First request is very slow**
- This is normal on free tier (cold start)
- Service spins down after 15 minutes
- Use UptimeRobot to keep it warm

**All requests are slow**
- Check if service is overloaded
- Monitor memory usage
- Consider upgrading

---

## Cost Comparison

### Free Tier (This Guide)
| Service | Cost |
|---------|------|
| Render (Backend + Workers) | Free |
| Vercel (Frontend) | Free |
| Supabase (Database) | Free |
| Upstash (Redis) | Free |
| AWS S3 | ~$1/month |
| **Total** | **~$1/month** |

### Paid Tier (Recommended for Production)
| Service | Cost |
|---------|------|
| Render Backend | $7/month |
| Render Workers | $7/month |
| Vercel | Free |
| Supabase | Free |
| Upstash | Free |
| AWS S3 | ~$1-5/month |
| **Total** | **~$15-20/month** |

---

## When to Upgrade

Upgrade to paid tier when:
- ❌ Cold starts are unacceptable
- ❌ Processing > 10 videos/day
- ❌ Need faster response times
- ❌ Running out of memory
- ❌ Have real users

---

## Alternative: Use Render Paid Tier

If free tier doesn't work, see:
- `RENDER_DEPLOY_STEPS.md` - Separate backend + workers
- Better performance
- No cold starts
- More memory

---

## Next Steps

1. ✅ Deploy combined service on Render
2. ⏭️ Deploy frontend on Vercel (free)
3. ⏭️ Test complete flow
4. ⏭️ Set up UptimeRobot (optional)
5. ⏭️ Monitor and optimize

---

## Summary

You now have:
- ✅ Backend + Workers in one service
- ✅ Running on Render free tier
- ✅ Total cost: ~$1/month
- ⚠️ Cold starts after 15 min inactivity
- ⚠️ Limited to 512MB RAM

**Good for**: Testing, demos, low traffic
**Not good for**: Production, high traffic

See `VERCEL_DEPLOY_STEPS.md` for frontend deployment!
