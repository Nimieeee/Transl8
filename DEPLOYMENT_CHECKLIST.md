# 🚀 Transl8 Deployment Checklist

## Pre-Deployment Setup

### 1. Database (Supabase) ✅
- [x] Supabase project created
- [x] Database URL: `https://sqgejzyslqozrdmmepfz.supabase.co`
- [ ] Get your database password from Supabase Dashboard
- [ ] Update `.env.production` with full connection string

**Get your connection string:**
1. Go to https://supabase.com/dashboard/project/sqgejzyslqozrdmmepfz/settings/database
2. Copy the "Connection string" under "Connection pooling"
3. Replace `[YOUR_PASSWORD]` with your database password

### 2. Redis (Upstash - Free)
- [ ] Create account at https://console.upstash.com
- [ ] Create Redis database (Free tier: 10K commands/day)
- [ ] Copy Redis URL to `.env.production`

### 3. API Keys
- [ ] OpenAI API key (for Whisper + TTS)
- [ ] Mistral API key (for translation)

### 4. GitHub Repository ✅
- [x] Repository: https://github.com/Nimieeee/Transl8.git
- [ ] Push code to GitHub

## Deployment Steps

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Initial Transl8 deployment"
git branch -M main
git push -u origin main
```

### Step 2: Deploy Frontend (Vercel - Free)
1. Go to https://vercel.com/new
2. Import from GitHub: `Nimieeee/Transl8`
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `packages/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Add environment variable:
   - `NEXT_PUBLIC_API_URL`: (will get from Render in Step 3)
5. Deploy!

### Step 3: Deploy Backend (Render - $7/month)
1. Go to https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Connect GitHub repo: `Nimieeee/Transl8`
4. Configure:
   - **Name**: `transl8-backend`
   - **Root Directory**: `packages/backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Starter ($7/month)
5. Add environment variables from `.env.production`
6. Deploy!
7. Copy the backend URL (e.g., `https://transl8-backend.onrender.com`)

### Step 4: Deploy Workers (Render - $7/month)
1. Go to https://dashboard.render.com/
2. Click "New +" → "Background Worker"
3. Connect GitHub repo: `Nimieeee/Transl8`
4. Configure:
   - **Name**: `transl8-workers`
   - **Root Directory**: `packages/workers`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Starter ($7/month)
5. Add same environment variables as backend
6. Deploy!

### Step 5: Update Frontend with Backend URL
1. Go back to Vercel dashboard
2. Add environment variable:
   - `NEXT_PUBLIC_API_URL`: `https://transl8-backend.onrender.com`
3. Redeploy frontend

### Step 6: Run Database Migrations
```bash
# From your local machine
cd packages/backend
DATABASE_URL="your_supabase_url" npx prisma migrate deploy
DATABASE_URL="your_supabase_url" npx prisma db seed
```

## Post-Deployment

### Test Your Deployment
1. Visit your Vercel URL
2. Create an account
3. Upload a test video
4. Verify dubbing works

### Monitor Your App
- **Frontend**: Vercel Dashboard
- **Backend**: Render Dashboard
- **Database**: Supabase Dashboard
- **Redis**: Upstash Dashboard

## Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| Vercel (Frontend) | Hobby | $0/month |
| Render (Backend) | Starter | $7/month |
| Render (Workers) | Starter | $7/month |
| Supabase (Database) | Free | $0/month |
| Upstash (Redis) | Free | $0/month |
| **Total** | | **$14/month** |

Plus API costs:
- OpenAI: ~$0.006/minute of audio
- Mistral: ~$0.002/1K tokens

## Quick Deploy Script

Use the automated script:
```bash
./deploy.sh
```

This will:
1. Install all dependencies
2. Build all packages
3. Run tests
4. Deploy frontend to Vercel
5. Provide instructions for Render deployment

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Render Docs**: https://render.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Upstash Docs**: https://docs.upstash.com
