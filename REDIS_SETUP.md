# Redis Setup for Transl8

## Why Redis?
Redis is used for the job queue (BullMQ) that manages the video dubbing pipeline stages.

## Option 1: Upstash (Recommended - Free Tier)

### Steps:
1. Go to https://upstash.com
2. Sign up / Log in
3. Click **Create Database**
4. Settings:
   - Name: `transl8-queue`
   - Type: **Redis**
   - Region: Choose closest to your Render region (Oregon)
   - Enable **TLS**
5. Click **Create**

### Get Credentials:
After creation, you'll see:
- **Endpoint**: `xxx-xxx.upstash.io`
- **Port**: `6379`
- **Password**: `AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ==`

### Add to Render:
1. Go to https://dashboard.render.com
2. Select `transl8-app` service
3. Go to **Environment** tab
4. Add these variables:
   ```
   REDIS_HOST=xxx-xxx.upstash.io
   REDIS_PORT=6379
   REDIS_PASSWORD=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxQ==
   ```
5. Click **Save Changes**
6. Render will automatically redeploy

### Free Tier Limits:
- 10,000 commands/day
- 256 MB storage
- TLS enabled
- Perfect for development and small projects

---

## Option 2: Redis Cloud (Alternative)

### Steps:
1. Go to https://redis.com/try-free
2. Sign up / Log in
3. Click **New Database**
4. Settings:
   - Name: `transl8`
   - Cloud: AWS
   - Region: us-west-2 (Oregon)
   - Type: Redis Stack
5. Click **Activate**

### Get Credentials:
- **Endpoint**: `redis-xxxxx.c1.us-west-2-1.ec2.cloud.redislabs.com`
- **Port**: `xxxxx`
- **Password**: From database settings

### Add to Render:
Same as Upstash above.

### Free Tier Limits:
- 30 MB storage
- 30 connections
- SSL/TLS enabled

---

## Option 3: Local Development (Not for Production)

For local testing only:

```bash
# Install Redis
brew install redis  # macOS
# or
sudo apt-get install redis-server  # Linux

# Start Redis
redis-server

# In .env file:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

---

## Verify Connection

After setting up Redis and redeploying, check Render logs for:
```
Workers started
```

If you see connection errors, verify:
1. REDIS_HOST is correct (no `redis://` prefix)
2. REDIS_PORT is correct
3. REDIS_PASSWORD is correct
4. TLS is enabled for Upstash/Redis Cloud

---

## Testing

Once Redis is set up:
1. Upload a video in your app
2. Check Render logs for:
   ```
   ✅ Dubbing started automatically for project xxx
   Downloading video from: ...
   Video downloaded, extracting audio...
   ```
3. Jobs will be processed through the queue

---

## Troubleshooting

### Error: "Connection refused"
- Check REDIS_HOST and REDIS_PORT
- Verify Redis instance is running

### Error: "Authentication failed"
- Check REDIS_PASSWORD
- Ensure password has no extra spaces

### Error: "TLS connection failed"
- For Upstash: TLS is required
- Code already handles this (checks for `upstash.io` in host)

### Jobs not processing
- Check if workers are running: Look for "Workers started" in logs
- Check Redis dashboard for queue size
- Verify API keys are set (OPENAI_API_KEY, MISTRAL_API_KEY)
