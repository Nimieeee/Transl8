# Testing the MVP Upload

## Services Status

✅ Backend running on http://localhost:3001
✅ Frontend running on http://localhost:3000
✅ Database (PostgreSQL) running
✅ Redis running

## How to Test

1. Open http://localhost:3000 in your browser
2. You should be automatically redirected to http://localhost:3000/upload
3. Click "Upload a file" or drag and drop a video
4. Select a video file (MP4, MOV, MKV, or AVI - max 100MB)
5. Click "Upload and Start Dubbing"
6. You'll be redirected to the status page
7. Watch the progress bar update in real-time
8. When complete, you'll be redirected to the download page
9. Click "Download Dubbed Video" to get your file

## What to Expect

- Upload page has a clean, modern UI with blue gradient
- Progress bar shows upload percentage
- Status page polls every 2 seconds for updates
- Download page appears when job is complete

## Troubleshooting

**"Upload failed" error:**
- Check browser console (F12) for errors
- Verify backend is running: `curl http://localhost:3001/health`
- Check backend logs in the terminal

**Upload stuck at 0%:**
- File might be too large (>100MB)
- Check network tab in browser dev tools
- Verify CORS is working

**Backend not responding:**
- Check if port 3001 is in use: `lsof -i :3001`
- Restart backend: Kill the process and run `cd packages/backend && npm run dev`

## Quick Backend Test

```bash
# Test health endpoint
curl http://localhost:3001/health

# Should return: {"status":"ok","timestamp":"..."}
```

## Current Limitations (MVP)

- Only English → Spanish translation
- No authentication required
- No user accounts
- Files expire after 24 hours
- Max file size: 100MB
- Max 10 uploads per hour per IP
