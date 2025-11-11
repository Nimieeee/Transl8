# 🎬 AI Video Dubbing MVP - Simple Version (No Auth)

## Quick Start

```bash
./mvp-simple-start.sh
```

Then open http://localhost:3000 in your browser.

## What's Different

This MVP version removes authentication to make it simpler:

- ✅ No login/registration required
- ✅ Direct access to upload page
- ✅ Upload videos immediately
- ✅ Track job status with job ID
- ✅ Download completed videos

## How It Works

1. **Upload**: Go to http://localhost:3000 (auto-redirects to /upload)
2. **Select Video**: Choose an MP4 file (max 100MB)
3. **Process**: Video is automatically queued for dubbing (English → Spanish)
4. **Track**: You'll be redirected to status page to monitor progress
5. **Download**: Once complete, download your dubbed video

## Features

- 🎯 English to Spanish translation
- 🎤 AI voice synthesis
- 🎬 Lip synchronization
- ⚡ Real-time progress tracking
- 📥 Direct download

## Manual Start (if script doesn't work)

```bash
# Terminal 1: Start Docker
docker-compose up -d

# Terminal 2: Start Backend
cd packages/backend
npm run dev

# Terminal 3: Start Frontend
cd packages/frontend
npm run dev
```

## Testing

1. Upload a short video (< 1 minute recommended for testing)
2. Wait for processing to complete
3. Download the dubbed video

## Troubleshooting

**Upload fails?**
- Check backend is running on port 3001
- Check Docker containers are running
- Check file size is under 100MB

**Frontend not loading?**
- Make sure port 3000 is available
- Try clearing browser cache
- Check console for errors

**Backend errors?**
- Check database connection
- Check Redis is running
- Check uploads directory exists

## Next Steps

Once this MVP works, you can add:
- User authentication
- Multiple language support
- Voice cloning
- Advanced editing features
