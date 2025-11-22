# Deployment Checklist

Quick checklist to deploy your app to Render free tier with Supabase.

---

## Prerequisites

- [ ] GitHub account with code pushed
- [ ] Supabase account
- [ ] Upstash account  
- [ ] Render account
- [ ] Vercel account
- [ ] OpenAI API key

---

## 1. Supabase Setup (5 min)

- [ ] Create new Supabase project
- [ ] Copy Project URL
- [ ] Copy service_role key (NOT anon key!)
- [ ] Go to SQL Editor
- [ ] Run `supabase-schema.sql`
- [ ] Verify tables created in Table Editor
- [ ] Create storage buckets: `videos`, `audio`, `thumbnails`

---

## 2. Upstash Redis Setup (2 min)

- [ ] Create new Redis database
- [ ] Copy endpoint (e.g., `xxx.upstash.io`)
- [ ] Copy password
- [ ] Note: Port is always `6379`

---

## 3. Generate JWT Secret (1 min)

Run in terminal:
```bash
openssl rand -base64 32
```

- [ ] Copy the output

---

## 4. Deploy to Render (10 min)

- [ ] Go to Render dashboard
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub repo
- [ ] Name: `transl8-app`
- [ ] Runtime: Node
- [ ] Build command:
  ```
  npm install && cd packages/backend && npm install && npm run build && cd ../workers && npm install && npm run build
  ```
- [ ] Start command:
  ```
  cd packages/backend && npm run start:with-workers
  ```
- [ ] Plan: **Free**
- [ ] Add environment variables (see below)
- [ ] Click "Create Web Service"
- [ ] Wait for deployment
- [ ] Test: `curl https://your-app.onrender.com/health`

### Environment Variables for Render

```bash
NODE_ENV=production
PORT=8080
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
JWT_SECRET=your-generated-secret
OPENAI_API_KEY=sk-proj-your-key
MISTRAL_API_KEY=your-mistral-key
FRONTEND_URL=https://your-app.vercel.app
```

---

## 5. Deploy Frontend to Vercel (5 min)

- [ ] Go to Vercel dashboard
- [ ] Click "Add New" → "Project"
- [ ] Import GitHub repo
- [ ] Framework: Next.js
- [ ] Root Directory: `packages/frontend`
- [ ] Add environment variable:
  ```
  NEXT_PUBLIC_API_URL=https://your-app.onrender.com
  ```
- [ ] Click "Deploy"
- [ ] Wait for deployment
- [ ] Copy your Vercel URL

---

## 6. Update Backend with Frontend URL

- [ ] Go back to Render dashboard
- [ ] Open your `transl8-app` service
- [ ] Click "Environment"
- [ ] Update `FRONTEND_URL` to your Vercel URL
- [ ] Click "Save Changes" (will trigger redeploy)

---

## 7. Test Everything (5 min)

### Test Backend Health
```bash
curl https://your-app.onrender.com/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### Test Registration
```bash
curl -X POST https://your-app.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

Expected: `{"token":"...","user":{...}}`

### Check Supabase
- [ ] Go to Supabase Table Editor
- [ ] Open `users` table
- [ ] Verify test user exists

### Test Frontend
- [ ] Open your Vercel URL
- [ ] Try to register/login
- [ ] Check if UI loads correctly

---

## 8. Optional: Keep Warm (2 min)

To prevent cold starts:

- [ ] Go to https://uptimerobot.com
- [ ] Create free account
- [ ] Add monitor:
  - Type: HTTP(s)
  - URL: `https://your-app.onrender.com/health`
  - Interval: 5 minutes
- [ ] Save

---

## Troubleshooting

### Backend won't start
- Check Render logs for errors
- Verify all environment variables are set
- Make sure SUPABASE_SERVICE_KEY is the service_role key

### "Connection refused" errors
- Check Redis credentials
- Verify REDIS_HOST doesn't include `redis://` prefix
- Test Redis connection in Upstash dashboard

### Frontend can't connect
- Verify NEXT_PUBLIC_API_URL in Vercel
- Check FRONTEND_URL in Render
- Look for CORS errors in browser console

### Workers not processing
- Check Render logs for "✅ Backend and workers started"
- Verify OPENAI_API_KEY is valid
- Check Redis connection

---

## You're Done! 🎉

Your app is now deployed on:
- ✅ Render (backend + workers)
- ✅ Vercel (frontend)
- ✅ Supabase (database + storage)
- ✅ Upstash (Redis queue)

**Total cost: $0/month**

### Important Notes

- First request after 15 min will be slow (cold start)
- Free tier is for testing/demos only
- Monitor usage in each dashboard
- Upgrade to paid plans when ready for production

### URLs to Bookmark

- Backend: `https://your-app.onrender.com`
- Frontend: `https://your-app.vercel.app`
- Supabase: `https://app.supabase.com`
- Upstash: `https://console.upstash.com`
- Render: `https://dashboard.render.com`

---

## Next Steps

1. Test video upload and processing
2. Monitor logs for errors
3. Check Supabase storage usage
4. Monitor Redis command usage
5. Plan for scaling when needed

See `DEPLOY_SUPABASE_RENDER.md` for detailed instructions!
