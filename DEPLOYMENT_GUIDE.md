# Deployment Guide - Render + Vercel + Supabase

Complete guide to deploy your video dubbing platform.

## Architecture

- **Frontend**: Vercel (Next.js)
- **Backend**: Render (Express.js API)
- **Workers**: Render (BullMQ workers)
- **Database**: Supabase (PostgreSQL)
- **Queue**: Upstash Redis
- **Storage**: AWS S3

## Prerequisites

1. GitHub account with your code pushed
2. Supabase account
3. Render account
4. Vercel account
5. Upstash account (for Redis)
6. AWS account (for S3)
7. OpenAI API key

---

## Step 1: Setup Supabase Database

### 1.1 Create Project
1. Go to https://supabase.com
2. Click "New Project"
3. Choose organization and region
4. Set database password (save it!)
5. Wait for project to be created

### 1.2 Run Schema
1. Go to SQL Editor in Supabase dashboard
2. Copy contents of `supabase-schema.sql`
3. Paste and run the SQL
4. Verify tables are created in Table Editor

### 1.3 Get Connection String
1. Go to Project Settings → Database
2. Copy the connection string (Connection pooling → Transaction mode)
3. Replace `[YOUR-PASSWORD]` with your database password
4. Format: `postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

---

## Step 2: Setup Upstash Redis

### 2.1 Create Database
1. Go to https://upstash.com
2. Create account and new Redis database
3. Choose region close to your Render region
4. Select "Global" for better performance

### 2.2 Get Connection Details
1. Go to database details
2. Copy the connection details:
   - **REDIS_HOST**: `xxx.upstash.io`
   - **REDIS_PORT**: `6379`
   - **REDIS_PASSWORD**: (shown in dashboard)

---

## Step 3: Setup AWS S3

### 3.1 Create Bucket
1. Go to AWS S3 Console
2. Create new bucket (e.g., `transl8-videos`)
3. Choose region
4. Uncheck "Block all public access" (we'll use signed URLs)
5. Enable versioning (optional)

### 3.2 Create IAM User
1. Go to IAM → Users → Create user
2. Name: `transl8-s3-user`
3. Attach policy: `AmazonS3FullAccess` (or create custom policy)
4. Create access key
5. Save **Access Key ID** and **Secret Access Key**

### 3.3 Configure CORS
Add this CORS policy to your bucket:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

---

## Step 4: Deploy Backend to Render

### 4.1 Connect Repository
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository

### 4.2 Configure Service
- **Name**: `transl8-backend`
- **Region**: Oregon (or closest to you)
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Environment**: Node
- **Build Command**: 
  ```bash
  cd packages/backend && npm install && npx prisma generate && npm run build
  ```
- **Start Command**: 
  ```bash
  cd packages/backend && node dist/index.js
  ```
- **Plan**: Starter ($7/month)

### 4.3 Add Environment Variables
Click "Advanced" → "Add Environment Variable":

```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
JWT_SECRET=your-random-secret-key-min-32-chars
OPENAI_API_KEY=sk-proj-your-key
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
S3_BUCKET=transl8-videos
FRONTEND_URL=https://your-app.vercel.app
```

### 4.4 Deploy
1. Click "Create Web Service"
2. Wait for deployment (5-10 minutes)
3. Check logs for errors
4. Test health endpoint: `https://transl8-backend.onrender.com/health`

---

## Step 5: Deploy Workers to Render

### 5.1 Create Worker Service
1. Go to Render Dashboard
2. Click "New +" → "Background Worker"
3. Select same repository

### 5.2 Configure Worker
- **Name**: `transl8-workers`
- **Region**: Same as backend
- **Branch**: `main`
- **Build Command**: 
  ```bash
  cd packages/workers && npm install && npm run build
  ```
- **Start Command**: 
  ```bash
  cd packages/workers && node dist/index.js
  ```
- **Plan**: Starter ($7/month)

### 5.3 Add Environment Variables
Same as backend:
```bash
NODE_ENV=production
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
OPENAI_API_KEY=sk-proj-your-key
```

### 5.4 Deploy
1. Click "Create Background Worker"
2. Wait for deployment
3. Check logs to verify workers are running

---

## Step 6: Deploy Frontend to Vercel

### 6.1 Connect Repository
1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import your GitHub repository

### 6.2 Configure Project
- **Framework Preset**: Next.js
- **Root Directory**: `packages/frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 6.3 Add Environment Variables
Click "Environment Variables":

```bash
NEXT_PUBLIC_API_URL=https://transl8-backend.onrender.com/api
```

### 6.4 Deploy
1. Click "Deploy"
2. Wait for deployment (2-3 minutes)
3. Get your URL: `https://your-app.vercel.app`

### 6.5 Update Backend FRONTEND_URL
1. Go back to Render backend service
2. Update `FRONTEND_URL` environment variable
3. Set to your Vercel URL: `https://your-app.vercel.app`
4. Redeploy backend

---

## Step 7: Verify Deployment

### 7.1 Test Backend
```bash
# Health check
curl https://transl8-backend.onrender.com/health

# Should return: {"status":"ok","timestamp":"..."}
```

### 7.2 Test Frontend
1. Open `https://your-app.vercel.app`
2. Try to sign up
3. Create a project
4. Upload a video (small test file)

### 7.3 Check Workers
1. Go to Render workers logs
2. Should see: "Workers started"
3. Upload a video and check if jobs are processed

---

## Step 8: Configure Custom Domain (Optional)

### 8.1 Frontend Domain (Vercel)
1. Go to Vercel project settings
2. Click "Domains"
3. Add your domain (e.g., `app.yourdomain.com`)
4. Follow DNS instructions

### 8.2 Backend Domain (Render)
1. Go to Render service settings
2. Click "Custom Domain"
3. Add domain (e.g., `api.yourdomain.com`)
4. Update DNS records

### 8.3 Update Environment Variables
Update `FRONTEND_URL` in backend and `NEXT_PUBLIC_API_URL` in frontend with new domains.

---

## Troubleshooting

### Backend Won't Start
**Check logs in Render dashboard**

Common issues:
- Database connection failed → Check DATABASE_URL
- Redis connection failed → Check REDIS_HOST and REDIS_PORT
- Prisma errors → Make sure schema is applied to Supabase

### Workers Not Processing
**Check worker logs**

Common issues:
- Can't connect to Redis → Check REDIS_HOST
- OpenAI API errors → Check OPENAI_API_KEY
- Database errors → Check DATABASE_URL

### Frontend Can't Connect to Backend
**Check browser console**

Common issues:
- CORS errors → Check FRONTEND_URL in backend matches Vercel URL
- 404 errors → Check NEXT_PUBLIC_API_URL is correct
- Network errors → Check backend is running

### Database Connection Issues
**Test connection**
```bash
psql "postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

Common issues:
- Wrong password
- Wrong connection string format
- Firewall blocking connection

---

## Environment Variables Checklist

### Backend (Render)
- [ ] NODE_ENV=production
- [ ] PORT=8080
- [ ] DATABASE_URL (Supabase)
- [ ] REDIS_HOST (Upstash)
- [ ] REDIS_PORT=6379
- [ ] JWT_SECRET
- [ ] OPENAI_API_KEY
- [ ] AWS_ACCESS_KEY_ID
- [ ] AWS_SECRET_ACCESS_KEY
- [ ] AWS_REGION
- [ ] S3_BUCKET
- [ ] FRONTEND_URL (Vercel URL)

### Workers (Render)
- [ ] NODE_ENV=production
- [ ] DATABASE_URL (Supabase)
- [ ] REDIS_HOST (Upstash)
- [ ] REDIS_PORT=6379
- [ ] OPENAI_API_KEY

### Frontend (Vercel)
- [ ] NEXT_PUBLIC_API_URL (Render backend URL)

---

## Monitoring

### Render
- Check service logs in dashboard
- Set up log drains (optional)
- Monitor resource usage

### Vercel
- Check deployment logs
- Monitor function execution
- Check analytics

### Supabase
- Monitor database size
- Check query performance
- Set up backups

---

## Costs Estimate

| Service | Plan | Cost |
|---------|------|------|
| Render Backend | Starter | $7/month |
| Render Workers | Starter | $7/month |
| Vercel | Hobby | Free |
| Supabase | Free | Free (up to 500MB) |
| Upstash Redis | Free | Free (10K commands/day) |
| AWS S3 | Pay-as-you-go | ~$1-5/month |
| **Total** | | **~$15-20/month** |

---

## Scaling

### When to Upgrade

**Backend/Workers**:
- Upgrade to Standard ($25/month) when:
  - Processing > 100 videos/day
  - Need more CPU/memory
  - Need faster response times

**Database**:
- Upgrade Supabase when:
  - Database > 500MB
  - Need more connections
  - Need better performance

**Redis**:
- Upgrade Upstash when:
  - > 10K commands/day
  - Need more memory
  - Need better performance

---

## Security Checklist

- [ ] All API keys are in environment variables (not in code)
- [ ] JWT_SECRET is strong and random
- [ ] Database password is strong
- [ ] S3 bucket uses signed URLs (not public)
- [ ] CORS is configured correctly
- [ ] HTTPS is enabled (automatic on Render/Vercel)
- [ ] Rate limiting is enabled (add if needed)

---

## Backup Strategy

### Database (Supabase)
- Automatic daily backups (free tier: 7 days)
- Manual backups before major changes
- Export schema regularly

### Files (S3)
- Enable versioning
- Set up lifecycle policies
- Consider cross-region replication

---

## Support

### Issues?
1. Check service logs
2. Verify environment variables
3. Test connections
4. Check API keys validity

### Need Help?
- Render: https://render.com/docs
- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- Upstash: https://upstash.com/docs

---

## Next Steps

After deployment:
1. Test all features thoroughly
2. Set up monitoring/alerts
3. Configure custom domains
4. Add more features
5. Optimize performance

**Your platform is now live! 🎉**
