# 🚀 Deploy Transl8 in 15 Minutes

## Your Setup
- **Database**: https://sqgejzyslqozrdmmepfz.supabase.co ✅
- **GitHub**: https://github.com/Nimieeee/Transl8.git ✅

## Step 1: Get Your Credentials (5 min)

### Supabase Database Password
1. Go to https://supabase.com/dashboard/project/sqgejzyslqozrdmmepfz/settings/database
2. Under "Connection string", copy the full URL
3. It looks like: `postgresql://postgres.sqgejzyslqozrdmmepfz:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

### Upstash Redis (Free)
1. Go to https://console.upstash.com/redis
2. Create new database (select free tier)
3. Copy the Redis URL

### API Keys
- **OpenAI**: https://platform.openai.com/api-keys
- **Mistral**: https://console.mistral.ai/api-keys/

## Step 2: Update .env.production (2 min)

Edit `.env.production` and add your credentials:
```bash
DATABASE_URL="your_supabase_connection_string"
REDIS_URL="your_upstash_redis_url"
OPENAI_API_KEY="sk-..."
MISTRAL_API_KEY="..."
```

## Step 3: Push to GitHub (1 min)

```bash
git add .
git commit -m "Initial Transl8 deployment"
git branch -M main
git push -u origin main
```

## Step 4: Deploy Frontend to Vercel (3 min)

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select `Nimieeee/Transl8`
4. Configure:
   - **Framework**: Next.js
   - **Root Directory**: `packages/frontend`
   - **Build Command**: `npm run build`
5. Click "Deploy"
6. Copy your Vercel URL (e.g., `https://transl8-xyz.vercel.app`)

## Step 5: Deploy Backend to Render (4 min)

1. Go to https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Connect your GitHub: `Nimieeee/Transl8`
4. Configure:
   - **Name**: `transl8-backend`
   - **Root Directory**: `packages/backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Starter ($7/month)
5. Add Environment Variables (copy from `.env.production`):
   - `DATABASE_URL`
   - `REDIS_URL`
   - `OPENAI_API_KEY`
   - `MISTRAL_API_KEY`
   - `NODE_ENV` = `production`
   - `PORT` = `3001`
   - `FRONTEND_URL` = (your Vercel URL from Step 4)
6. Click "Create Web Service"
7. Copy your backend URL (e.g., `https://transl8-backend.onrender.com`)

## Step 6: Deploy Workers to Render (4 min)

1. In Render, click "New +" → "Background Worker"
2. Connect same GitHub repo
3. Configure:
   - **Name**: `transl8-workers`
   - **Root Directory**: `packages/workers`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Starter ($7/month)
4. Add same environment variables as backend
5. Click "Create Background Worker"

## Step 7: Update Frontend with Backend URL (1 min)

1. Go back to Vercel dashboard
2. Go to your project → Settings → Environment Variables
3. Add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: Your backend URL from Step 5
4. Go to Deployments → Click "..." → "Redeploy"

## Step 8: Initialize Database (1 min)

From your local machine:
```bash
cd packages/backend
DATABASE_URL="your_supabase_url" npx prisma migrate deploy
DATABASE_URL="your_supabase_url" npx prisma db seed
```

## 🎉 Done! Test Your App

1. Visit your Vercel URL
2. Create an account
3. Upload a video
4. Watch the magic happen!

## 💰 Monthly Cost

- Vercel (Frontend): **$0**
- Render Backend: **$7**
- Render Workers: **$7**
- Supabase: **$0**
- Upstash Redis: **$0**
- **Total: $14/month** + API usage

## 🆘 Troubleshooting

### Backend won't start
- Check environment variables in Render dashboard
- View logs in Render dashboard

### Frontend can't connect to backend
- Make sure `NEXT_PUBLIC_API_URL` is set in Vercel
- Check CORS settings in backend

### Database connection fails
- Verify DATABASE_URL is correct
- Make sure you're using the connection pooling URL from Supabase

## 📚 Resources

- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Full Deployment Guide](./DEPLOYMENT_CHECKLIST.md)
