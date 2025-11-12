# Render Deployment Guide

Complete guide to deploy Transl8 on Render.

## Architecture

- **Frontend**: Vercel (already deployed ✅)
- **Backend + Workers**: Render Web Service (Docker)
- **Database**: Supabase PostgreSQL
- **Redis**: Upstash Redis
- **Storage**: Local filesystem (Render persistent disk)

## Prerequisites

1. GitHub repository with latest code
2. Render account (free tier available)
3. Supabase PostgreSQL database
4. Upstash Redis instance
5. API keys (OpenAI, Mistral)

## Step 1: Prepare External Services

### Supabase (PostgreSQL)

1. Go to https://supabase.com
2. Create new project
3. Get connection string from Settings → Database
4. Format: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

### Upstash (Redis)

1. Go to https://console.upstash.com
2. Create new Redis database
3. Copy the connection URL (NOT the CLI command)
4. Format: `redis://default:[PASSWORD]@[HOST].upstash.io:6379`

## Step 2: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. **Go to Render Dashboard**: https://dashboard.render.com

2. **Create New Blueprint**:
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository: `Nimieeee/Transl8`
   - Render will detect `render.yaml` automatically

3. **Configure Environment Variables**:
   
   Click on the service and add these environment variables:
   
   ```env
   # Database
   DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   
   # Redis (Upstash)
   REDIS_URL=redis://default:[PASSWORD]@[HOST].upstash.io:6379
   
   # API Keys
   OPENAI_API_KEY=sk-proj-...
   MISTRAL_API_KEY=...
   GEMINI_API_KEY=...
   
   # Security
   JWT_SECRET=your-super-secret-jwt-key-change-this
   
   # Frontend URL (from Vercel)
   FRONTEND_URL=https://frontend-hxsbt3wqm-toluwanimis-projects-ab3d7a78.vercel.app
   
   # Configuration
   NODE_ENV=production
   PORT=8080
   USE_OPENAI_WHISPER=true
   WORKER_CONCURRENCY=2
   ```

4. **Deploy**:
   - Click "Apply"
   - Wait 5-10 minutes for build and deployment
   - You'll get a URL like: `https://transl8-backend.onrender.com`

### Option B: Manual Setup

1. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Select branch: `main`

2. **Configure Build**:
   - **Name**: `transl8-backend`
   - **Region**: Oregon (or closest to you)
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Environment**: Docker
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Context**: `.`
   - **Instance Type**: Starter ($7/month) or Free

3. **Add Environment Variables** (same as above)

4. **Deploy**: Click "Create Web Service"

## Step 3: Run Database Migrations

After deployment, run migrations:

1. Go to your service in Render
2. Click "Shell" tab
3. Run:
   ```bash
   cd packages/backend
   npx prisma migrate deploy
   npx prisma db seed
   ```

Or use Render's one-off job feature.

## Step 4: Update Vercel Frontend

Update your frontend environment variable:

1. Go to Vercel dashboard
2. Select your frontend project
3. Settings → Environment Variables
4. Add/Update:
   ```
   NEXT_PUBLIC_API_URL=https://transl8-backend.onrender.com
   ```
5. Redeploy frontend

## Step 5: Verify Deployment

### Check Backend Health

```bash
curl https://transl8-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "storage": "connected"
  }
}
```

### Check Workers

Look at the logs in Render dashboard. You should see:
```
Workers service initialized
Starting workers...
✓ STT Worker started (OpenAI Whisper)
✓ Adaptation Worker started (Mistral AI)
✓ TTS Worker started (OpenAI TTS)
✓ Final Assembly Worker started (Absolute Sync)
✓ Muxing Worker started (FFmpeg)
All workers started successfully!
```

### Test Full Flow

1. Visit your Vercel frontend URL
2. Register/Login
3. Create a project
4. Upload a test video
5. Monitor processing in Render logs

## Render-Specific Configuration

### Persistent Storage

Render provides 1GB free persistent storage. To enable:

1. Go to service settings
2. Scroll to "Disks"
3. Add disk:
   - **Name**: `uploads`
   - **Mount Path**: `/app/packages/backend/uploads`
   - **Size**: 1GB (free) or more

### Auto-Deploy

Render automatically deploys when you push to `main` branch.

To disable:
1. Service Settings → Build & Deploy
2. Toggle "Auto-Deploy" off

### Custom Domain

1. Service Settings → Custom Domain
2. Add your domain
3. Update DNS records as instructed
4. Update `FRONTEND_URL` in Vercel to match

## Monitoring & Logs

### View Logs

- **Live Logs**: Dashboard → Service → Logs tab
- **Download Logs**: Click "Download" button

### Metrics

Render provides:
- CPU usage
- Memory usage
- Request count
- Response times

Access via Dashboard → Service → Metrics tab

## Troubleshooting

### Build Fails

**Problem**: Docker build fails

**Solutions**:
1. Check Dockerfile syntax
2. Verify all dependencies in package.json
3. Check build logs for specific errors
4. Try building locally: `docker build -t transl8 .`

### Workers Not Starting

**Problem**: Workers don't appear in logs

**Solutions**:
1. Check `start-with-workers.js` is being executed
2. Verify Redis connection (check REDIS_URL)
3. Check worker logs for errors
4. Ensure workers are built: `npm run build --workspace=@dubbing/workers`

### Database Connection Fails

**Problem**: "Can't reach database server"

**Solutions**:
1. Verify DATABASE_URL is correct
2. Check Supabase connection pooler is enabled
3. Use connection pooler URL (port 6543), not direct connection (port 5432)
4. Whitelist Render IPs in Supabase (usually not needed)

### Redis Connection Fails

**Problem**: ENOENT or connection refused

**Solutions**:
1. Verify REDIS_URL format (no CLI flags!)
2. Check Upstash Redis is active
3. Ensure URL is decoded (no %20 characters)
4. Test connection: `redis-cli -u $REDIS_URL ping`

### Out of Memory

**Problem**: Service crashes with OOM error

**Solutions**:
1. Upgrade to larger instance type
2. Reduce WORKER_CONCURRENCY to 1
3. Add memory limits in code
4. Monitor memory usage in Render metrics

### Slow Performance

**Problem**: Requests are slow

**Solutions**:
1. Check if on free tier (spins down after inactivity)
2. Upgrade to paid tier for always-on service
3. Optimize database queries
4. Add Redis caching
5. Use CDN for static assets

## Cost Optimization

### Free Tier Limitations

- Service spins down after 15 minutes of inactivity
- 750 hours/month free
- Slower build times
- No persistent disk

### Recommended Paid Setup

- **Web Service**: Starter ($7/month)
  - Always on
  - 512MB RAM
  - 0.5 CPU
  - Good for MVP

- **Persistent Disk**: $0.25/GB/month
  - 5GB recommended for uploads

**Total**: ~$8-10/month

### Scaling Up

When you need more:
- **Standard**: $25/month (2GB RAM, 1 CPU)
- **Pro**: $85/month (4GB RAM, 2 CPU)
- **Pro Plus**: $175/month (8GB RAM, 4 CPU)

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://...` |
| `REDIS_URL` | Yes | Redis connection string | `redis://...` |
| `OPENAI_API_KEY` | Yes | OpenAI API key | `sk-proj-...` |
| `MISTRAL_API_KEY` | Yes | Mistral AI API key | `...` |
| `JWT_SECRET` | Yes | Secret for JWT tokens | Random string |
| `FRONTEND_URL` | Yes | Vercel frontend URL | `https://...vercel.app` |
| `GEMINI_API_KEY` | No | Google Gemini API key | `...` |
| `NODE_ENV` | Yes | Environment | `production` |
| `PORT` | Yes | Server port | `8080` |
| `USE_OPENAI_WHISPER` | No | Use OpenAI Whisper API | `true` |
| `WORKER_CONCURRENCY` | No | Worker concurrency | `2` |

## Next Steps

1. ✅ Backend + Workers deployed on Render
2. ✅ Frontend deployed on Vercel
3. ✅ Database on Supabase
4. ✅ Redis on Upstash
5. Set up monitoring (Sentry, LogRocket)
6. Configure custom domain
7. Set up CI/CD pipeline
8. Add staging environment

## Support

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Status Page**: https://status.render.com

## Quick Commands

```bash
# View logs
render logs -s transl8-backend

# SSH into service
render ssh -s transl8-backend

# Run migrations
render run -s transl8-backend "cd packages/backend && npx prisma migrate deploy"

# Restart service
render restart -s transl8-backend
```
