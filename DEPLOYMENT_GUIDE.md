# Transl8 Deployment Guide

## Overview

This guide covers deploying Transl8 to:
- **Frontend**: Vercel
- **Backend + Workers**: Render
- **Database**: Supabase (PostgreSQL)
- **Redis**: Upstash or Render Redis

## Prerequisites

- Vercel account
- Render account
- Supabase account
- Upstash account (for Redis) or use Render Redis
- API Keys:
  - OpenAI API key
  - Mistral AI API key

---

## 1. Database Setup (Supabase)

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Wait for database to be provisioned
4. Go to Settings → Database
5. Copy the connection string (Transaction mode)

### Step 2: Set up Database Schema

```bash
# Install Prisma CLI
npm install -g prisma

# Navigate to backend
cd packages/backend

# Set DATABASE_URL in .env
echo "DATABASE_URL=your_supabase_connection_string" > .env

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### Connection String Format:
```
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

---

## 2. Redis Setup (Upstash)

### Option A: Upstash (Recommended)

1. Go to https://upstash.com
2. Create a new Redis database
3. Copy the connection URL

### Option B: Render Redis

1. In Render dashboard, create a new Redis instance
2. Copy the connection URL

---

## 3. Backend + Workers Deployment (Render)

### Step 1: Create Render Web Service

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `transl8-backend`
   - **Root Directory**: `packages/backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: At least "Starter" ($7/month) for workers

### Step 2: Set Environment Variables

Add these in Render dashboard:

```bash
# Database
DATABASE_URL=your_supabase_connection_string

# Redis
REDIS_URL=your_upstash_or_render_redis_url

# API Keys
OPENAI_API_KEY=your_openai_key
MISTRAL_API_KEY=your_mistral_key

# Server
NODE_ENV=production
PORT=3001

# CORS
FRONTEND_URL=https://your-vercel-app.vercel.app

# Workers (if separate)
WORKER_CONCURRENCY=2
```

### Step 3: Create Workers Service (Optional - Separate)

If you want to separate workers from backend:

1. Create another Web Service
2. **Name**: `transl8-workers`
3. **Root Directory**: `packages/workers`
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm start`
6. Add same environment variables

---

## 4. Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

Create `packages/frontend/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "@api_url"
  }
}
```

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to frontend
cd packages/frontend

# Deploy
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set root directory to packages/frontend
```

### Step 3: Set Environment Variables

In Vercel dashboard:

```bash
NEXT_PUBLIC_API_URL=https://your-render-backend.onrender.com
```

### Step 4: Deploy Production

```bash
vercel --prod
```

---

## 5. Post-Deployment Configuration

### Update CORS in Backend

Edit `packages/backend/src/config/cors.ts`:

```typescript
const allowedOrigins = [
  'https://your-vercel-app.vercel.app',
  'https://your-custom-domain.com', // if you have one
];
```

### Update API URL in Frontend

Ensure `NEXT_PUBLIC_API_URL` points to your Render backend.

---

## 6. File Storage Configuration

### Option A: Local Storage (Development)

Files stored in `temp/` directory (not recommended for production)

### Option B: AWS S3 (Recommended for Production)

1. Create S3 bucket
2. Add environment variables:

```bash
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
```

3. Update storage configuration in backend

### Option C: Cloudflare R2

Similar to S3 but cheaper for egress.

---

## 7. Monitoring & Logging

### Render Logs

- View logs in Render dashboard
- Set up log drains to external services

### Sentry (Error Tracking)

Already configured! Just add:

```bash
SENTRY_DSN=your_sentry_dsn
```

### Uptime Monitoring

Use services like:
- UptimeRobot
- Pingdom
- Better Uptime

---

## 8. Scaling Considerations

### Backend Scaling

- Start with Render "Starter" plan
- Scale up to "Standard" or "Pro" as needed
- Consider separating workers to dedicated instance

### Database Scaling

- Supabase Free tier: Good for testing
- Upgrade to Pro for production
- Enable connection pooling

### Redis Scaling

- Upstash scales automatically
- Monitor memory usage

### Worker Concurrency

Adjust based on instance size:

```bash
# Starter instance (512MB RAM)
WORKER_CONCURRENCY=1

# Standard instance (2GB RAM)
WORKER_CONCURRENCY=2

# Pro instance (4GB+ RAM)
WORKER_CONCURRENCY=4
```

---

## 9. Cost Estimation

### Monthly Costs (Approximate)

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby | $0 (Free) |
| Render Backend | Starter | $7 |
| Render Workers | Starter | $7 (if separate) |
| Supabase | Free/Pro | $0-$25 |
| Upstash Redis | Free/Pay-as-go | $0-$10 |
| **Total** | | **$14-$49/month** |

Plus API costs:
- OpenAI: ~$0.10-0.50 per video
- Mistral AI: ~$0.05-0.20 per video

---

## 10. Deployment Checklist

### Pre-Deployment

- [ ] All environment variables documented
- [ ] Database migrations tested
- [ ] CORS configured correctly
- [ ] API keys obtained
- [ ] Error tracking set up

### Deployment

- [ ] Supabase database created
- [ ] Redis instance created
- [ ] Backend deployed to Render
- [ ] Workers deployed (same or separate)
- [ ] Frontend deployed to Vercel
- [ ] Environment variables set

### Post-Deployment

- [ ] Test video upload
- [ ] Test full dubbing pipeline
- [ ] Verify download works
- [ ] Check logs for errors
- [ ] Set up monitoring
- [ ] Configure custom domain (optional)

---

## 11. Troubleshooting

### Common Issues

**Issue**: Database connection fails
- Check DATABASE_URL format
- Verify Supabase allows connections
- Check connection pooling settings

**Issue**: Workers not processing jobs
- Verify Redis connection
- Check worker logs in Render
- Ensure REDIS_URL is correct

**Issue**: CORS errors
- Update allowed origins in backend
- Verify FRONTEND_URL environment variable
- Check Vercel deployment URL

**Issue**: File upload fails
- Check file size limits (Render: 100MB default)
- Verify temp directory permissions
- Consider using S3 for large files

---

## 12. Custom Domain Setup

### Vercel (Frontend)

1. Go to Vercel project settings
2. Add custom domain
3. Update DNS records as instructed

### Render (Backend)

1. Go to Render service settings
2. Add custom domain
3. Update DNS records
4. SSL certificate auto-provisioned

---

## 13. Backup Strategy

### Database Backups

Supabase provides automatic backups:
- Free tier: 7 days
- Pro tier: 30 days

### Manual Backups

```bash
# Backup database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

---

## 14. Security Checklist

- [ ] Environment variables not committed to git
- [ ] API keys rotated regularly
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation in place
- [ ] SQL injection prevention (Prisma handles this)
- [ ] File upload validation

---

## Support

For issues:
1. Check Render logs
2. Check Vercel deployment logs
3. Check Supabase logs
4. Review error tracking (Sentry)

---

**Ready to deploy!** 🚀
