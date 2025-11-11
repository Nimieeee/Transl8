# 🎬 Testing Upload with Your MOV File

## Rate Limiter Disabled

✅ I've temporarily disabled the rate limiter so you can test freely.

## How to Test

### Option 1: Browser Upload (Recommended)

1. **Open the app**: http://localhost:3000
2. **You'll be redirected** to the upload page
3. **Click "Upload a file"** or drag and drop
4. **Select**: `Movie on 11-1-25 at 2.33 PM.mov`
5. **Click**: "Upload and Start Dubbing"
6. **Watch**: Progress bar and status updates

### Option 2: Command Line Test

If you want to test via command line:

```bash
# Test the upload endpoint directly
curl -X POST http://localhost:3001/api/dub/upload \
  -F "video=@Movie on 11-1-25 at 2.33 PM.mov" \
  -F "targetLanguage=es" \
  -F "sourceLanguage=en" \
  -v
```

## What to Expect

### 1. Upload Phase
- Progress bar shows 0-100%
- File is uploaded to server
- Saved to `packages/backend/uploads/`

### 2. Processing Phase
You'll be redirected to status page showing:
- **0-20%**: Extracting audio from video
- **20-40%**: Transcribing audio (Whisper)
- **40-60%**: Translating text (Marian/LibreTranslate)
- **60-80%**: Generating Spanish speech (TTS)
- **80-100%**: Merging audio with video

### 3. Download Phase
- Automatic redirect to download page
- Click "Download Dubbed Video"
- Get your dubbed MOV file

## Current MVP Behavior

Since the full pipeline isn't set up yet, the MVP will:
1. ✅ Accept your MOV file
2. ✅ Extract audio using FFmpeg
3. ✅ Create mock transcription
4. ✅ Use LibreTranslate API for translation (or mock)
5. ✅ Generate silent audio (placeholder)
6. ✅ Merge back to video
7. ✅ Provide download link

## Checking Progress

### Watch Backend Logs
```bash
# In terminal, watch the backend process
tail -f backend.log

# Or check the process output
# (Process ID: 9)
```

### Check Database
```bash
# See all jobs
docker exec -it dubbing-postgres psql -U postgres -d dubbing_platform -c "SELECT id, status, progress FROM dubbing_jobs ORDER BY created_at DESC LIMIT 5;"
```

### Check Uploaded Files
```bash
# See uploaded videos
ls -lh packages/backend/uploads/

# See output videos
ls -lh packages/backend/uploads/output/
```

## Troubleshooting

### Upload Fails
- Check file size: `ls -lh "Movie on 11-1-25 at 2.33 PM.mov"`
- Must be under 100MB
- Check backend logs for errors

### Stuck at Processing
- Check if FFmpeg is installed: `ffmpeg -version`
- Check backend logs: `tail -f backend.log`
- Check job status in database

### No Download Link
- Check if output file exists
- Check job status is "completed"
- Check for errors in backend logs

## Re-enable Rate Limiter

After testing, re-enable the rate limiter:

1. Edit `packages/backend/src/index.ts`
2. Uncomment line: `app.use(ipRateLimiter);`
3. Backend will auto-reload

## Test Results to Check

After upload completes, verify:
- [ ] MOV file accepted (not rejected)
- [ ] Job created in database
- [ ] Progress updates work
- [ ] Status page shows updates
- [ ] Download page appears
- [ ] Can download output file
- [ ] Output file is valid MP4

## Expected Timeline

For a typical video:
- **Upload**: 10-30 seconds (depends on file size)
- **Processing**: 1-3 minutes (MVP with mocks)
- **Total**: 2-4 minutes

## Success Indicators

✅ Upload completes without errors
✅ Redirected to status page
✅ Progress bar updates every 2 seconds
✅ Status changes: pending → processing → completed
✅ Redirected to download page
✅ Download button works
✅ Output file plays correctly

## Need Help?

If something goes wrong:
1. Check browser console (F12)
2. Check backend logs
3. Check database for job status
4. Share error messages

Ready to test! Open http://localhost:3000 and upload your MOV file! 🚀
