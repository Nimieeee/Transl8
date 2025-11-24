# Deployment Verification Checklist

## Issue
Frontend was calling `https://transl8.onrender.com/projects` instead of `https://transl8.onrender.com/api/projects`

## Root Cause
The `NEXT_PUBLIC_API_URL` environment variable wasn't properly configured in the deployment.

## Fixes Applied

### 1. Frontend Configuration Files
✅ **packages/frontend/next.config.js**
- Changed default from `http://localhost:3001` to `http://localhost:3001/api`

✅ **packages/frontend/.env.local**
- Set to `https://transl8.onrender.com/api`

✅ **packages/frontend/.env.example**
- Updated to `http://localhost:3001/api`

✅ **packages/frontend/src/lib/api-client.ts**
- Already correct with fallback to `http://localhost:3001/api`

### 2. Backend Configuration
✅ **packages/backend/src/index.ts**
- Routes correctly mounted at `/api/projects` and `/api/dub`
- PORT configured from env or defaults to 3001
- CORS configured to accept frontend URL

### 3. Vercel Configuration
✅ **vercel.json**
- Build and output directories correctly set
- Environment variables should be set in Vercel dashboard

## Deployment Steps

### Step 1: Commit and Push Changes
```bash
git add .
git commit -m "Fix API URL configuration for production"
git push
```

### Step 2: Verify Vercel Environment Variables
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

**Required Variable:**
- Name: `NEXT_PUBLIC_API_URL`
- Value: `https://transl8.onrender.com/api`
- Environments: Production, Preview, Development

### Step 3: Redeploy on Vercel
1. Go to Deployments tab
2. Click "..." on latest deployment
3. Select "Redeploy"
4. **IMPORTANT:** Uncheck "Use existing Build Cache"
5. Click "Redeploy"

### Step 4: Verify Backend on Render
Check that your backend is running:
- Health check: `https://transl8.onrender.com/health`
- Should return: `{"status":"ok","timestamp":"..."}`

### Step 5: Test API Endpoints
After redeployment, test:
- GET `https://transl8.onrender.com/api/projects` (should return empty array or projects)
- POST `https://transl8.onrender.com/api/projects` (should create a project)

## Verification

### Check Browser Console
After redeployment, open browser console on your frontend:
- Should see requests to `https://transl8.onrender.com/api/projects`
- Should NOT see requests to `https://transl8.onrender.com/projects`

### Check Network Tab
1. Open DevTools → Network tab
2. Navigate to dashboard
3. Look for XHR/Fetch requests
4. Verify all API calls include `/api` prefix

## Backend Environment Variables (Render)
Ensure these are set in Render dashboard:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `MISTRAL_API_KEY`
- `FRONTEND_URL` (should be your Vercel URL)
- `PORT` (Render sets this automatically to 8080)

## All API Endpoints
Backend exposes these routes:
- `GET /health` - Health check
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `POST /api/projects/:id/upload` - Upload video
- `POST /api/dub/start` - Start dubbing process

## Troubleshooting

### If still getting 404 errors:
1. Clear browser cache completely
2. Open in incognito/private window
3. Check Vercel deployment logs for build errors
4. Verify environment variable is visible in Vercel logs during build
5. Check that `.env.local` is in `.gitignore` (it should be)

### If CORS errors:
1. Verify `FRONTEND_URL` is set correctly in Render
2. Should match your Vercel deployment URL exactly
3. No trailing slash

### If backend not responding:
1. Check Render logs for errors
2. Verify all environment variables are set
3. Check that Supabase and Redis are accessible
