# Render Environment Variables - Complete List

All environment variables you need to add in Render dashboard.

---

## 📋 Complete List (11 Variables)

Copy and paste these into Render → Environment Variables:

### 1. NODE_ENV
```
production
```
**What it does**: Sets Node.js to production mode

---

### 2. PORT
```
8080
```
**What it does**: Port for the web service (Render requires 8080)

---

### 3. DATABASE_URL
```
postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```
**Where to get it**:
1. Go to Supabase Dashboard
2. Settings → Database
3. Connection String → Transaction mode
4. Copy and replace `[YOUR-PASSWORD]` with your database password

**Example**:
```
postgresql://postgres.abcdefghijklmnop:MySecurePassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

### 4. REDIS_HOST
```
xxx-12345.upstash.io
```
**Where to get it**:
1. Go to Upstash Dashboard
2. Select your Redis database
3. Copy the "Endpoint" (without the port)

**Example**:
```
gusc1-magical-shark-12345.upstash.io
```

---

### 5. REDIS_PORT
```
6379
```
**What it does**: Standard Redis port

---

### 6. REDIS_PASSWORD
```
AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz123456
```
**Where to get it**:
1. Go to Upstash Dashboard
2. Select your Redis database
3. Copy the "Password"

---

### 7. JWT_SECRET
```
your-random-32-character-secret-key-here
```
**How to generate**:
```bash
openssl rand -base64 32
```

**Example output**:
```
K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=
```

---

### 8. OPENAI_API_KEY
```
sk-proj-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ
```
**Where to get it**:
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-proj-` or `sk-`)

---

### 9. SUPABASE_URL
```
https://abcdefghijklmnop.supabase.co
```
**Where to get it**:
1. Go to Supabase Dashboard
2. Settings → API
3. Copy "Project URL"

**Example**:
```
https://xyzabcdefghijklm.supabase.co
```

---

### 10. SUPABASE_SERVICE_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjk4NzY1NDMyLCJleHAiOjIwMTQzNDE0MzJ9.abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ
```
**Where to get it**:
1. Go to Supabase Dashboard
2. Settings → API
3. Copy "service_role" key (NOT the anon key!)

⚠️ **Important**: Use the **service_role** key, not the **anon** key!

---

### 11. FRONTEND_URL
```
https://your-app.vercel.app
```
**What to put**:
- Initially: `https://your-app.vercel.app` (placeholder)
- After Vercel deployment: Your actual Vercel URL

**Example**:
```
https://transl8-abc123.vercel.app
```

---

## 📝 Quick Copy Template

Copy this template and fill in your values:

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

---

## 🔍 How to Add in Render

1. Go to Render Dashboard
2. Click on your web service
3. Go to **"Environment"** tab
4. Click **"Add Environment Variable"**
5. Add each variable one by one:
   - Key: `NODE_ENV`
   - Value: `production`
   - Click "Save"
6. Repeat for all 11 variables
7. Service will automatically redeploy

---

## ✅ Verification Checklist

After adding all variables:

- [ ] NODE_ENV = production
- [ ] PORT = 8080
- [ ] DATABASE_URL (starts with postgresql://)
- [ ] REDIS_HOST (ends with .upstash.io)
- [ ] REDIS_PORT = 6379
- [ ] REDIS_PASSWORD (long string)
- [ ] JWT_SECRET (32+ characters)
- [ ] OPENAI_API_KEY (starts with sk-)
- [ ] SUPABASE_URL (starts with https://)
- [ ] SUPABASE_SERVICE_KEY (starts with eyJ)
- [ ] FRONTEND_URL (starts with https://)

---

## 🚨 Common Mistakes

### DATABASE_URL
❌ Wrong: Using "Direct connection" string
✅ Correct: Using "Transaction mode" string with `?pgbouncer=true`

### SUPABASE_SERVICE_KEY
❌ Wrong: Using "anon" key
✅ Correct: Using "service_role" key

### REDIS_HOST
❌ Wrong: Including port (xxx.upstash.io:6379)
✅ Correct: Just hostname (xxx.upstash.io)

### JWT_SECRET
❌ Wrong: Short password like "secret123"
✅ Correct: Long random string (32+ chars)

---

## 🔄 Updating Variables

To update a variable later:

1. Go to Render Dashboard
2. Click your service
3. Environment tab
4. Click the variable
5. Edit value
6. Click "Save Changes"
7. Service will redeploy automatically

---

## 🆘 Troubleshooting

### Service Won't Start

**Check logs for**:
- "Cannot connect to database" → Check DATABASE_URL
- "Redis connection failed" → Check REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- "Invalid JWT secret" → Check JWT_SECRET is set

### Test Connections

**Database**:
```bash
psql "YOUR_DATABASE_URL"
```

**Redis**:
```bash
redis-cli -h YOUR_REDIS_HOST -p 6379 -a YOUR_REDIS_PASSWORD ping
```

---

## 📖 Related Guides

- `SUPABASE_STORAGE_SETUP.md` - Get Supabase credentials
- `RENDER_FREE_DEPLOY.md` - Complete deployment guide
- `FREE_DEPLOYMENT_COMPLETE.md` - Full free tier setup

---

## Summary

**Total**: 11 environment variables
**Time to add**: ~5 minutes
**Required services**: Supabase, Upstash, OpenAI

All set? Deploy and test! 🚀
