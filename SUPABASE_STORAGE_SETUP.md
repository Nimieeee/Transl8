# Supabase Storage Setup - FREE Alternative to AWS S3

Use Supabase Storage instead of AWS S3 - completely FREE!

---

## Why Supabase Storage?

✅ **FREE**: 1GB storage included
✅ **Easy**: Already using Supabase for database
✅ **Fast**: CDN-backed
✅ **Simple**: No AWS account needed

---

## Step 1: Get Supabase Credentials

### 1.1 Go to Supabase Dashboard

1. Open your project at https://supabase.com
2. Go to **Settings** → **API**

### 1.2 Copy These Values

**Project URL**:
```
https://xxx.supabase.co
```
Copy this - it's your `SUPABASE_URL`

**Service Role Key** (secret):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Copy this - it's your `SUPABASE_SERVICE_KEY`

⚠️ **Important**: Use the **service_role** key, NOT the **anon** key!

---

## Step 2: Create Storage Bucket

### 2.1 Go to Storage

1. In Supabase Dashboard, click **Storage**
2. Click **"New bucket"**

### 2.2 Configure Bucket

- **Name**: `videos`
- **Public bucket**: ✅ Check this
- **File size limit**: 500 MB
- **Allowed MIME types**: Leave empty (allow all)

Click **"Create bucket"**

### 2.3 Set Bucket Policies

1. Click on the `videos` bucket
2. Go to **Policies** tab
3. Click **"New policy"**

**Policy 1: Allow Public Read**
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'videos' );
```

**Policy 2: Allow Authenticated Upload**
```sql
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'videos' );
```

**Policy 3: Allow Authenticated Delete**
```sql
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'videos' );
```

---

## Step 3: Update Environment Variables

### Remove AWS Variables

You NO LONGER need:
- ❌ `AWS_ACCESS_KEY_ID`
- ❌ `AWS_SECRET_ACCESS_KEY`
- ❌ `AWS_REGION`
- ❌ `S3_BUCKET`

### Add Supabase Variables

Add these to your Render environment variables:

```bash
SUPABASE_URL=https://xxx.supabase.co
```

```bash
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Step 4: Redeploy

After updating environment variables:

1. Go to Render Dashboard
2. Click your service
3. Click **"Manual Deploy"** → **"Deploy latest commit"**
4. Wait for deployment

---

## Verification

### Test Upload

```bash
curl -X POST https://your-app.onrender.com/api/projects/:id/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "video=@test.mp4"
```

### Check Storage

1. Go to Supabase Dashboard → Storage → videos
2. You should see uploaded files

---

## Storage Limits

### Free Tier
- **Storage**: 1 GB
- **Bandwidth**: 2 GB/month
- **File size**: Up to 50 MB per file

### Paid Tier ($25/month)
- **Storage**: 100 GB
- **Bandwidth**: 200 GB/month
- **File size**: Up to 5 GB per file

---

## Cost Comparison

### AWS S3
- Storage: $0.023/GB/month
- Bandwidth: $0.09/GB
- **Typical cost**: $1-5/month

### Supabase Storage
- **Free tier**: $0/month (1GB)
- **Paid tier**: $25/month (100GB)

**For small projects**: Supabase is FREE! 🎉

---

## File URLs

Files will be accessible at:
```
https://xxx.supabase.co/storage/v1/object/public/videos/projects/abc123/video.mp4
```

---

## Troubleshooting

### Upload Fails

**Error: "Bucket not found"**
- Create the `videos` bucket in Supabase Dashboard
- Make sure it's set to public

**Error: "Permission denied"**
- Check bucket policies are set correctly
- Verify SUPABASE_SERVICE_KEY is correct

**Error: "File too large"**
- Free tier: 50MB limit per file
- Upgrade to paid tier for larger files

### Can't Access Files

**Error: "403 Forbidden"**
- Make sure bucket is public
- Check bucket policies allow SELECT

---

## Migration from AWS S3

If you were using AWS S3:

1. Update environment variables (remove AWS, add Supabase)
2. Redeploy application
3. Old S3 files will remain in S3
4. New uploads will go to Supabase
5. Optionally migrate old files manually

---

## Summary

✅ **Setup**: 5 minutes
✅ **Cost**: FREE (1GB)
✅ **No AWS account needed**
✅ **Integrated with your database**

**Total Platform Cost**: $0/month! 🎉

- Render: FREE
- Vercel: FREE
- Supabase (DB + Storage): FREE
- Upstash Redis: FREE

---

## Next Steps

1. ✅ Create Supabase bucket
2. ✅ Add environment variables to Render
3. ✅ Redeploy application
4. ✅ Test upload
5. ✅ Enjoy FREE storage!

Your platform now costs **$0/month**! 🚀
