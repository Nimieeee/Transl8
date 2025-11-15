# Render Deployment - Step by Step

Complete guide to deploy backend and workers on Render.

---

## Prerequisites

Before starting, have these ready:
- [ ] GitHub account with code pushed
- [ ] Supabase DATABASE_URL
- [ ] Upstash Redis credentials (HOST, PORT, PASSWORD)
- [ ] OpenAI API key
- [ ] AWS S3 credentials
- [ ] JWT secret (generate with: `openssl rand -base64 32`)

---

## Step 1: Deploy Backend (Web Service)

### 1.1 Create New Web Service

1. Go to https://render.com
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect account"** if not connected to GitHub
4. Find and select your repository: **Nimieeee/Transl8**
5. Click **"Connect"**

### 1.2 Configure Service Settings

**Basic Settings:**
- **Name**: `transl8-backend`
- **Region**: Oregon (or closest to you)
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Runtime**: `Node`

**Build & Deploy:**
- **Build Command**: 
  ```bash
  cd packages/backend && npm install && npx prisma generate && npm run build
  ```

- **Start Command**:
  ```bash
  cd packages/backend && node dist/index.js
  ```

**Instance Type:**
- **Plan**: Starter ($7/month)

### 1.3 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these one by one:

```bash
NODE_ENV=production
```

```bash
PORT=8080
```

```bash
DATABASE_URL=postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
*(Replace with your Supabase connection string)*

```bash
REDIS_HOST=xxx.upstash.io
```
*(Replace with your Upstash host)*

```bash
REDIS_PORT=6379
```

```bash
REDIS_PASSWORD=your-redis-password
```
*(Replace with your Upstash password)*

```bash
JWT_SECRET=your-random-32-character-secret
```
*(Generate with: `openssl rand -base64 32`)*

```bash
OPENAI_API_KEY=sk-proj-your-key-here
```
*(Your OpenAI API key)*

```bash
AWS_ACCESS_KEY_ID=your-aws-access-key
```

```bash
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

```bash
AWS_REGION=us-east-1
```

```bash
S3_BUCKET=transl8-videos
```
*(Your S3 bucket name)*

```bash
FRONTEND_URL=https://your-app.vercel.app
```
*(You'll update this after deploying frontend)*

### 1.4 Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Watch the logs for any errors
4. Once deployed, you'll see: **"Your service is live 🎉"**

### 1.5 Get Backend URL

Your backend URL will be:
```
https://transl8-backend.onrender.com
```

Copy this - you'll need it for the frontend!

### 1.6 Test Backend

```bash
curl https://transl8-backend.onrender.com/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-11-15T..."}
```

---

## Step 2: Deploy Workers (Background Worker)

### 2.1 Create New Background Worker

1. From Render Dashboard, click **"New +"** → **"Background Worker"**
2. Select the same repository: **Nimieeee/Transl8**
3. Click **"Connect"**

### 2.2 Configure Worker Settings

**Basic Settings:**
- **Name**: `transl8-workers`
- **Region**: Oregon (same as backend)
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Runtime**: `Node`

**Build & Deploy:**
- **Build Command**:
  ```bash
  cd packages/workers && npm install && npm run build
  ```

- **Start Command**:
  ```bash
  cd packages/workers && node dist/index.js
  ```

**Instance Type:**
- **Plan**: Starter ($7/month)

### 2.3 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these:

```bash
NODE_ENV=production
```

```bash
DATABASE_URL=postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
*(Same as backend)*

```bash
REDIS_HOST=xxx.upstash.io
```
*(Same as backend)*

```bash
REDIS_PORT=6379
```

```bash
REDIS_PASSWORD=your-redis-password
```
*(Same as backend)*

```bash
OPENAI_API_KEY=sk-proj-your-key-here
```
*(Same as backend)*

### 2.4 Deploy

1. Click **"Create Background Worker"**
2. Wait for deployment (3-5 minutes)
3. Watch the logs - you should see: **"Workers started"**

### 2.5 Verify Workers

Check the logs in Render dashboard. You should see:
```
Workers started
```

No errors should appear.

---

## Step 3: Update Backend with Frontend URL

After you deploy the frontend to Vercel (next step), come back here:

1. Go to Render Dashboard
2. Click on **transl8-backend** service
3. Go to **"Environment"** tab
4. Find **FRONTEND_URL** variable
5. Update it to your Vercel URL: `https://your-app.vercel.app`
6. Click **"Save Changes"**
7. Service will automatically redeploy

---

## Step 4: Monitor Deployment

### Check Backend Logs

1. Go to Render Dashboard
2. Click **transl8-backend**
3. Click **"Logs"** tab
4. Look for:
   ```
   Backend server running on port 8080
   ```

### Check Worker Logs

1. Go to Render Dashboard
2. Click **transl8-workers**
3. Click **"Logs"** tab
4. Look for:
   ```
   Workers started
   ```

---

## Troubleshooting

### Backend Won't Start

**Check logs for errors:**

**Error: "Cannot connect to database"**
- Verify DATABASE_URL is correct
- Check Supabase is running
- Test connection: `psql "YOUR_DATABASE_URL"`

**Error: "Cannot connect to Redis"**
- Verify REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- Check Upstash dashboard
- Test: `redis-cli -h HOST -p PORT -a PASSWORD ping`

**Error: "Prisma generate failed"**
- Check build command includes `npx prisma generate`
- Verify schema.prisma exists

**Error: "Module not found"**
- Check build command is correct
- Verify all dependencies in package.json

### Workers Won't Start

**Check logs for errors:**

**Error: "Cannot connect to Redis"**
- Same as backend troubleshooting

**Error: "OpenAI API error"**
- Verify OPENAI_API_KEY is correct
- Check API key has credits
- Test key: `curl https://api.openai.com/v1/models -H "Authorization: Bearer YOUR_KEY"`

### Build Fails

**Error: "Build command failed"**
- Check build command syntax
- Verify package.json exists
- Check for TypeScript errors locally first

**Error: "Out of memory"**
- Upgrade to higher plan
- Or optimize build process

---

## Verification Checklist

After deployment, verify:

- [ ] Backend health check works: `curl https://transl8-backend.onrender.com/health`
- [ ] Backend logs show: "Backend server running on port 8080"
- [ ] Workers logs show: "Workers started"
- [ ] No errors in logs
- [ ] Services show "Live" status in dashboard

---

## Cost Summary

| Service | Plan | Cost |
|---------|------|------|
| Backend | Starter | $7/month |
| Workers | Starter | $7/month |
| **Total** | | **$14/month** |

---

## Next Steps

1. ✅ Backend deployed
2. ✅ Workers deployed
3. ⏭️ Deploy frontend to Vercel (see VERCEL_DEPLOY_STEPS.md)
4. ⏭️ Update FRONTEND_URL in backend
5. ⏭️ Test complete flow

---

## Useful Commands

### View Logs
```bash
# From Render Dashboard → Service → Logs
```

### Restart Service
```bash
# From Render Dashboard → Service → Manual Deploy → "Clear build cache & deploy"
```

### Update Environment Variable
```bash
# From Render Dashboard → Service → Environment → Edit variable → Save
```

### Check Service Status
```bash
curl https://transl8-backend.onrender.com/health
```

---

## Support

### Render Documentation
- https://render.com/docs
- https://render.com/docs/web-services
- https://render.com/docs/background-workers

### Common Issues
- Build failures: Check build command
- Runtime errors: Check environment variables
- Connection errors: Check external services (DB, Redis)

---

## Summary

You should now have:
- ✅ Backend running at: `https://transl8-backend.onrender.com`
- ✅ Workers processing jobs
- ✅ All environment variables configured
- ✅ Services showing "Live" status

**Next**: Deploy frontend to Vercel!

See: `VERCEL_DEPLOY_STEPS.md`
