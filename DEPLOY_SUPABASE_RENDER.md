# Deploy to Render with Supabase (Free Tier)

Complete guide to deploy your app using:
- **Supabase** for database + storage (free)
- **Upstash Redis** for job queues (free)
- **Render** for backend + workers (free)
- **Vercel** for frontend (free)

Total cost: **$0/month** (with limitations)

---

## Step 1: Setup Supabase

### 1.1 Create Supabase Project

1. Go to https://supabase.com
2. Click **"New Project"**
3. Fill in:
   - **Name**: transl8-db
   - **Database Password**: (save this!)
   - **Region**: Choose closest to you
4. Wait 2-3 minutes for setup

### 1.2 Run Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste and click **"Run"**
5. Verify tables created in **Table Editor**

### 1.3 Setup Storage

1. Go to **Storage** in sidebar
2. Click **"New Bucket"**
3. Create bucket named: `videos`
4. Make it **public** (or configure policies)
5. Repeat for buckets: `audio`, `thumbnails`

### 1.4 Get Credentials

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxx.supabase.co`
   - **service_role key** (NOT anon key!)

---

## Step 2: Setup Upstash Redis

### 2.1 Create Redis Database

1. Go to https://upstash.com
2. Click **"Create Database"**
3. Fill in:
   - **Name**: transl8-queue
   - **Type**: Regional
   - **Region**: Same as Supabase
4. Click **"Create"**

### 2.2 Get Credentials

1. In database dashboard, copy:
   - **Endpoint**: `xxx.upstash.io`
   - **Port**: `6379`
   - **Password**: (shown in dashboard)

---

## Step 3: Deploy to Render

### 3.1 Create Web Service

1. Go to https://render.com/dashboard
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `transl8-app`
   - **Region**: Same as Supabase/Redis
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && cd packages/backend && npm install && npm run build && cd ../workers && npm install && npm run build
     ```
   - **Start Command**:
     ```bash
     cd packages/backend && npm run start:with-workers
     ```
   - **Plan**: **Free**

### 3.2 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

```bash
NODE_ENV=production
PORT=8080

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Redis
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=your-random-32-char-secret

# OpenAI
OPENAI_API_KEY=sk-proj-your-key

# Mistral (optional)
MISTRAL_API_KEY=your-mistral-key

# Frontend (add after deploying frontend)
FRONTEND_URL=https://your-app.vercel.app
```

### 3.3 Deploy

1. Click **"Create Web Service"**
2. Wait 5-10 minutes
3. Watch logs for:
   ```
   Backend server running on port 8080
   Starting workers...
   ✅ Backend and workers started
   ```

### 3.4 Test Backend

```bash
curl https://transl8-app.onrender.com/health
```

Expected response:
```json
{"status":"ok","timestamp":"..."}
```

---

## Step 4: Deploy Frontend to Vercel

### 4.1 Deploy

1. Go to https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repo
4. Configure:
   - **Framework**: Next.js
   - **Root Directory**: `packages/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 4.2 Add Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://transl8-app.onrender.com
```

### 4.3 Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. Get your URL: `https://your-app.vercel.app`

### 4.4 Update Backend

Go back to Render dashboard:
1. Go to your `transl8-app` service
2. Click **"Environment"**
3. Update `FRONTEND_URL` to your Vercel URL
4. Click **"Save Changes"** (will redeploy)

---

## Step 5: Verify Everything Works

### 5.1 Test Registration

```bash
curl -X POST https://transl8-app.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 5.2 Check Supabase

1. Go to Supabase **Table Editor**
2. Open `users` table
3. Verify your test user exists

### 5.3 Test Frontend

1. Open your Vercel URL
2. Try to register/login
3. Upload a test video

---

## Free Tier Limitations

### Render Free Tier
- ✅ 750 hours/month (enough for 1 service)
- ⚠️ Sleeps after 15 min inactivity
- ⚠️ Cold starts: 30-60 seconds
- ⚠️ 512MB RAM limit

### Supabase Free Tier
- ✅ 500MB database
- ✅ 1GB file storage
- ✅ 2GB bandwidth/month
- ⚠️ Paused after 1 week inactivity

### Upstash Redis Free Tier
- ✅ 10,000 commands/day
- ✅ 256MB storage
- ⚠️ Good for ~10-20 videos/day

### What This Means
- Perfect for testing/demos
- Not suitable for production
- First request after inactivity is slow
- Limited concurrent processing

---

## Keep Services Warm (Optional)

Use [UptimeRobot](https://uptimerobot.com) (free):

1. Create account
2. Add monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://transl8-app.onrender.com/health`
   - **Interval**: 5 minutes
3. This prevents Render from sleeping

---

## Troubleshooting

### "Out of memory" on Render
- Free tier has 512MB RAM
- Backend + Workers together use ~400MB
- Solution: Process smaller videos or upgrade to Starter ($7/month)

### "Connection refused" to Redis
- Check Redis credentials
- Verify REDIS_HOST doesn't include `redis://` prefix
- Check Upstash dashboard for connection string

### "Unauthorized" from Supabase
- Make sure you're using **service_role** key, not anon key
- Check SUPABASE_URL is correct
- Verify tables exist in Supabase

### Workers not processing jobs
- Check Render logs for errors
- Verify OPENAI_API_KEY is valid
- Check Redis connection
- Make sure workers started (look for "✅ Backend and workers started")

### Frontend can't connect to backend
- Check NEXT_PUBLIC_API_URL in Vercel
- Verify FRONTEND_URL in Render
- Check CORS settings in backend

---

## Cost to Upgrade

If free tier doesn't work:

| Service | Free | Paid |
|---------|------|------|
| Render | Free (with limits) | $7/month (Starter) |
| Supabase | Free (500MB) | $25/month (Pro) |
| Upstash | Free (10k/day) | $10/month (Pay-as-you-go) |
| Vercel | Free | Free (hobby) |

**Recommended upgrade path:**
1. Start with all free
2. If hitting limits, upgrade Render first ($7/month)
3. Then Upstash if processing many videos
4. Supabase last (free tier is generous)

---

## Next Steps

1. ✅ Deploy backend + workers to Render
2. ✅ Deploy frontend to Vercel
3. ✅ Test complete flow
4. ⏭️ Set up UptimeRobot (optional)
5. ⏭️ Monitor usage and upgrade as needed

---

## Summary

You now have:
- ✅ Supabase for database + storage
- ✅ Upstash Redis for job queues
- ✅ Render for backend + workers (single service)
- ✅ Vercel for frontend
- ✅ Total cost: $0/month
- ⚠️ Cold starts after 15 min
- ⚠️ Limited to 512MB RAM

**Perfect for**: Testing, demos, low traffic
**Not good for**: Production, high traffic, real users

When ready to scale, upgrade Render to Starter plan first!
