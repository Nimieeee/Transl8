# Vercel Deployment - Step by Step

Complete guide to deploy frontend on Vercel.

---

## Prerequisites

- [ ] Backend deployed on Render
- [ ] Backend URL: `https://transl8-backend.onrender.com`
- [ ] GitHub account with code pushed

---

## Step 1: Deploy to Vercel

### 1.1 Create New Project

1. Go to https://vercel.com
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. If not connected, click **"Connect GitHub Account"**
5. Find and select: **Nimieeee/Transl8**
6. Click **"Import"**

### 1.2 Configure Project

**Framework Preset:**
- Vercel should auto-detect: **Next.js**
- If not, select it manually

**Root Directory:**
- Click **"Edit"**
- Enter: `packages/frontend`
- Click **"Continue"**

**Build Settings:**
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

Leave these as default unless you need to change them.

### 1.3 Add Environment Variables

Click **"Environment Variables"**

Add this variable:

**Key**: `NEXT_PUBLIC_API_URL`

**Value**: `https://transl8-backend.onrender.com/api`
*(Replace with your actual Render backend URL)*

**Environments**: Select all (Production, Preview, Development)

Click **"Add"**

### 1.4 Deploy

1. Click **"Deploy"**
2. Wait for deployment (2-3 minutes)
3. Watch the build logs
4. Once complete, you'll see: **"Congratulations! 🎉"**

### 1.5 Get Frontend URL

Your frontend URL will be something like:
```
https://transl8-abc123.vercel.app
```

Or if you have a custom domain:
```
https://your-domain.com
```

Copy this URL - you need it for the next step!

---

## Step 2: Update Backend FRONTEND_URL

Now that you have your Vercel URL, update the backend:

1. Go to **Render Dashboard**
2. Click on **transl8-backend** service
3. Go to **"Environment"** tab
4. Find **FRONTEND_URL** variable
5. Click **"Edit"**
6. Update value to: `https://transl8-abc123.vercel.app`
7. Click **"Save Changes"**
8. Backend will automatically redeploy (takes 2-3 minutes)

---

## Step 3: Test Your Application

### 3.1 Open Frontend

1. Go to your Vercel URL: `https://transl8-abc123.vercel.app`
2. You should see the login page

### 3.2 Test Sign Up

1. Click **"Sign Up"** (or the toggle to switch to sign up)
2. Enter email: `test@example.com`
3. Enter password: `test123456`
4. Click **"Sign Up"**
5. You should be redirected to the dashboard

### 3.3 Test Project Creation

1. Click **"New Project"**
2. Enter name: `Test Project`
3. Select source language: `English`
4. Select target language: `Spanish`
5. Click **"Create"**
6. You should see the project in your dashboard

### 3.4 Test Video Upload (Optional)

1. Click on your test project
2. Upload a small video file (< 10MB)
3. Click **"Upload"**
4. Check Render logs to see if processing starts

---

## Step 4: Configure Custom Domain (Optional)

### 4.1 Add Domain to Vercel

1. Go to Vercel Dashboard
2. Click on your project
3. Go to **"Settings"** → **"Domains"**
4. Click **"Add"**
5. Enter your domain: `app.yourdomain.com`
6. Click **"Add"**

### 4.2 Configure DNS

Vercel will show you DNS records to add:

**For subdomain (app.yourdomain.com):**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

**For root domain (yourdomain.com):**
```
Type: A
Name: @
Value: 76.76.21.21
```

Add these records in your domain registrar's DNS settings.

### 4.3 Wait for DNS Propagation

- Usually takes 5-60 minutes
- Vercel will automatically issue SSL certificate
- You'll see a green checkmark when ready

### 4.4 Update Backend FRONTEND_URL Again

1. Go to Render Dashboard
2. Update **FRONTEND_URL** to your custom domain
3. Save and redeploy

---

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- Check `packages/frontend` directory exists
- Verify package.json is in the right place
- Check all imports are correct

**Error: "Build command failed"**
- Check build logs for specific error
- Test build locally: `cd packages/frontend && npm run build`
- Fix any TypeScript errors

### Frontend Can't Connect to Backend

**Error in browser console: "Network Error"**
- Check NEXT_PUBLIC_API_URL is correct
- Verify backend is running: `curl https://transl8-backend.onrender.com/health`
- Check backend logs for CORS errors

**Error: "CORS policy"**
- Verify FRONTEND_URL in backend matches your Vercel URL
- Check backend has redeployed after updating FRONTEND_URL
- Backend should show: `CORS configured for: https://your-app.vercel.app`

### Page Not Found

**Error: "404 - Page Not Found"**
- Check root directory is set to `packages/frontend`
- Verify Next.js pages exist in `src/app/`
- Check build logs for errors

---

## Verification Checklist

After deployment, verify:

- [ ] Frontend loads: `https://your-app.vercel.app`
- [ ] Can see login page
- [ ] Can sign up
- [ ] Can log in
- [ ] Can create project
- [ ] No console errors
- [ ] Backend FRONTEND_URL updated
- [ ] CORS working (no errors)

---

## Vercel Dashboard Features

### Deployments
- View all deployments
- See build logs
- Rollback to previous version

### Analytics
- View page views
- See performance metrics
- Monitor errors

### Logs
- View function logs
- See real-time requests
- Debug issues

### Settings
- Environment variables
- Custom domains
- Build settings

---

## Cost

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Hobby | Free |
| Vercel | Pro | $20/month (if needed) |

**Note**: Hobby plan is usually sufficient for most projects.

---

## Next Steps

1. ✅ Frontend deployed
2. ✅ Backend FRONTEND_URL updated
3. ✅ Application tested
4. ⏭️ Test complete video dubbing flow
5. ⏭️ Monitor logs and performance
6. ⏭️ Add custom domain (optional)

---

## Useful Commands

### Redeploy
```bash
# From Vercel Dashboard → Deployments → Latest → "Redeploy"
```

### View Logs
```bash
# From Vercel Dashboard → Deployments → Latest → "View Function Logs"
```

### Update Environment Variable
```bash
# From Vercel Dashboard → Settings → Environment Variables → Edit
```

### Test Locally
```bash
cd packages/frontend
npm run dev
# Open http://localhost:3000
```

---

## Support

### Vercel Documentation
- https://vercel.com/docs
- https://vercel.com/docs/frameworks/nextjs
- https://vercel.com/docs/deployments/troubleshoot

### Common Issues
- Build failures: Check build logs
- CORS errors: Update backend FRONTEND_URL
- 404 errors: Check root directory setting

---

## Summary

You should now have:
- ✅ Frontend running at: `https://your-app.vercel.app`
- ✅ Backend connected and working
- ✅ CORS configured correctly
- ✅ Can sign up and create projects

**Your platform is now live! 🎉**

Test the complete flow:
1. Sign up
2. Create project
3. Upload video
4. Watch it process
5. Download result

---

## Complete Deployment URLs

- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://transl8-backend.onrender.com`
- **API**: `https://transl8-backend.onrender.com/api`
- **Health**: `https://transl8-backend.onrender.com/health`

**Congratulations! Your video dubbing platform is live! 🚀**
