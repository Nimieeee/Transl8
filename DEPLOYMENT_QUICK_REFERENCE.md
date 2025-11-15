# 🚀 Deployment Quick Reference

Everything you need in one place.

---

## 📋 Render Environment Variables (11 total)

```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
JWT_SECRET=your-random-secret
OPENAI_API_KEY=sk-proj-your-key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
FRONTEND_URL=https://your-app.vercel.app
```

📖 **Details**: `RENDER_ENV_VARIABLES.md`

---

## 🗄️ Supabase Setup

### 1. Database Schema
1. SQL Editor → New query
2. Copy all from `supabase-schema.sql`
3. Paste and Run
4. Verify 17 tables created

📖 **Details**: `SUPABASE_SCHEMA_SETUP.md`

### 2. Storage Bucket
1. Storage → New bucket
2. Name: `videos`
3. Public: ✅
4. Create

📖 **Details**: `SUPABASE_STORAGE_SETUP.md`

### 3. Get Credentials

**DATABASE_URL**:
- Settings → Database → Connection String (Transaction mode)

**SUPABASE_URL**:
- Settings → API → Project URL

**SUPABASE_SERVICE_KEY**:
- Settings → API → service_role key

---

## 🔴 Upstash Redis Setup

1. Create database at upstash.com
2. Copy:
   - **REDIS_HOST**: Endpoint (without port)
   - **REDIS_PORT**: 6379
   - **REDIS_PASSWORD**: Password from dashboard

---

## 🤖 OpenAI Setup

1. Go to platform.openai.com/api-keys
2. Create new key
3. Copy **OPENAI_API_KEY**

---

## 🔐 JWT Secret

Generate:
```bash
openssl rand -base64 32
```

Copy output as **JWT_SECRET**

---

## 🎨 Render Deployment

### Build Command
```bash
npm install && cd packages/backend && npm install && npx prisma generate && npm run build && cd ../workers && npm install && npm run build && cd ../..
```

### Start Command
```bash
cd packages/backend && npm run start:with-workers
```

### Plan
**Free**

📖 **Details**: `RENDER_FREE_DEPLOY.md`

---

## ▲ Vercel Deployment

### Settings
- Root: `packages/frontend`
- Build: Auto-detected
- Plan: Free

### Environment Variable
```bash
NEXT_PUBLIC_API_URL=https://your-app.onrender.com/api
```

📖 **Details**: `VERCEL_DEPLOY_STEPS.md`

---

## ✅ Deployment Checklist

### Before Deploying
- [ ] Supabase project created
- [ ] Database schema applied (17 tables)
- [ ] Storage bucket created (`videos`)
- [ ] Upstash Redis created
- [ ] OpenAI API key obtained
- [ ] JWT secret generated
- [ ] All credentials copied

### Render Deployment
- [ ] Web service created
- [ ] Build command set
- [ ] Start command set
- [ ] 11 environment variables added
- [ ] Service deployed successfully
- [ ] Health check passes

### Vercel Deployment
- [ ] Project imported
- [ ] Root directory set
- [ ] Environment variable added
- [ ] Deployment successful
- [ ] Frontend loads

### Final Steps
- [ ] Update FRONTEND_URL in Render
- [ ] Redeploy Render service
- [ ] Test sign up
- [ ] Test project creation
- [ ] Test video upload

---

## 🧪 Testing

### Backend Health
```bash
curl https://your-app.onrender.com/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### Frontend
Open: `https://your-app.vercel.app`

### Complete Flow
1. Sign up
2. Create project
3. Upload video
4. Check processing in Render logs

---

## 💰 Total Cost

| Service | Cost |
|---------|------|
| Render | FREE |
| Vercel | FREE |
| Supabase | FREE |
| Upstash | FREE |
| OpenAI | ~$0.10/video |
| **Total** | **$0/month** |

---

## 📚 Complete Guides

| Guide | Purpose |
|-------|---------|
| `FREE_DEPLOYMENT_COMPLETE.md` | Complete free deployment |
| `RENDER_ENV_VARIABLES.md` | All environment variables |
| `SUPABASE_SCHEMA_SETUP.md` | Database schema setup |
| `SUPABASE_STORAGE_SETUP.md` | Storage bucket setup |
| `RENDER_FREE_DEPLOY.md` | Render deployment |
| `VERCEL_DEPLOY_STEPS.md` | Vercel deployment |

---

## 🆘 Quick Troubleshooting

**Backend won't start**
→ Check DATABASE_URL format (Transaction mode)

**Workers not processing**
→ Check REDIS credentials and OPENAI_API_KEY

**Frontend can't connect**
→ Check FRONTEND_URL in Render matches Vercel URL

**Upload fails**
→ Check SUPABASE_SERVICE_KEY (use service_role, not anon)

---

## 🎯 Quick Links

- Supabase: https://supabase.com
- Upstash: https://upstash.com
- OpenAI: https://platform.openai.com
- Render: https://render.com
- Vercel: https://vercel.com

---

**Ready to deploy? Start with `FREE_DEPLOYMENT_COMPLETE.md`! 🚀**
