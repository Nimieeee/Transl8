# 🚀 Transl8 - Start Your Deployment

## ✅ What's Done

Your Transl8 platform is now on GitHub!
- **Repository**: https://github.com/Nimieeee/Transl8.git
- **Database**: https://sqgejzyslqozrdmmepfz.supabase.co

## 📋 Next: Complete Your Deployment

### 1. Get Your API Keys (5 minutes)

#### Supabase Database
1. Go to: https://supabase.com/dashboard/project/sqgejzyslqozrdmmepfz/settings/database
2. Copy your connection string (it includes your password)

#### Upstash Redis (Free)
1. Go to: https://console.upstash.com/redis
2. Create a new database (free tier)
3. Copy the Redis URL

#### OpenAI
1. Go to: https://platform.openai.com/api-keys
2. Create a new API key

#### Mistral AI
1. Go to: https://console.mistral.ai/api-keys
2. Create a new API key

### 2. Deploy Frontend (Vercel - 3 minutes)

1. Go to: https://vercel.com/new
2. Click "Import Git Repository"
3. Select: `Nimieeee/Transl8`
4. Configure:
   - **Framework**: Next.js
   - **Root Directory**: `packages/frontend`
   - **Build Command**: `npm run build`
5. Click "Deploy"
6. **Save your Vercel URL** (e.g., `https://transl8-xyz.vercel.app`)

### 3. Deploy Backend (Render - 4 minutes)

1. Go to: https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Connect GitHub: `Nimieeee/Transl8`
4. Configure:
   - **Name**: `transl8-backend`
   - **Root Directory**: `packages/backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Starter ($7/month)
5. Add Environment Variables:
   ```
   DATABASE_URL=your_supabase_connection_string
   REDIS_URL=your_upstash_redis_url
   OPENAI_API_KEY=sk-...
   MISTRAL_API_KEY=...
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=your_vercel_url_from_step_2
   ```
6. Click "Create Web Service"
7. **Save your backend URL** (e.g., `https://transl8-backend.onrender.com`)

### 4. Deploy Workers (Render - 4 minutes)

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

### 5. Update Frontend (1 minute)

1. Go back to Vercel dashboard
2. Your project → Settings → Environment Variables
3. Add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: Your backend URL from Step 3
4. Go to Deployments → Click "..." → "Redeploy"

### 6. Initialize Database (1 minute)

From your terminal:
```bash
cd packages/backend
DATABASE_URL="your_supabase_url" npx prisma migrate deploy
DATABASE_URL="your_supabase_url" npx prisma db seed
```

## 🎉 Test Your App!

1. Visit your Vercel URL
2. Create an account
3. Upload a test video
4. Watch it get dubbed!

## 💰 Monthly Cost

- **Vercel** (Frontend): $0
- **Render** (Backend): $7
- **Render** (Workers): $7
- **Supabase** (Database): $0
- **Upstash** (Redis): $0
- **Total**: **$14/month** + API usage

## 📚 Helpful Links

- **Detailed Guide**: See `DEPLOY_NOW.md`
- **Full Checklist**: See `DEPLOYMENT_CHECKLIST.md`
- **Quick Deploy Script**: Run `./quick-deploy.sh`

## 🆘 Need Help?

- Check `DEPLOY_NOW.md` for troubleshooting
- Vercel Docs: https://vercel.com/docs
- Render Docs: https://render.com/docs
- Supabase Docs: https://supabase.com/docs

---

**Ready to launch Transl8!** 🎬
