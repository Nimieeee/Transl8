# 🚀 Chatterbox Quick Start

Get voice cloning working in 5 minutes with Resemble AI's Chatterbox!

## Step 1: Get API Credentials (2 minutes)

1. Sign up at https://www.resemble.ai/
2. Create a new project
3. Go to Settings → API Keys
4. Copy your API key and Project UUID

## Step 2: Configure Environment (1 minute)

Add to your `.env` file:

```bash
RESEMBLE_API_KEY=your_api_key_here
RESEMBLE_PROJECT_UUID=your_project_uuid_here
CHATTERBOX_SERVICE_URL=http://localhost:5003
```

Or export them:

```bash
export RESEMBLE_API_KEY='your_api_key_here'
export RESEMBLE_PROJECT_UUID='your_project_uuid_here'
```

## Step 3: Setup Service (1 minute)

```bash
./SETUP_CHATTERBOX.sh
```

## Step 4: Start Service (30 seconds)

```bash
./START_CHATTERBOX.sh
```

You should see:
```
✅ Starting Chatterbox on port 5003...
 * Running on http://0.0.0.0:5003
```

## Step 5: Test It (30 seconds)

```bash
./test-chatterbox.sh
```

## That's It! 🎉

Your dubbing system now uses Chatterbox for voice cloning:

1. Upload a video
2. The system extracts the original voice
3. Chatterbox clones the voice
4. Generates dubbed audio with the cloned voice
5. Perfect lip-sync with Wav2Lip

## Test the Full Pipeline

```bash
# Upload a test video
./test-upload.sh

# Or use the web interface
npm run dev
# Visit http://localhost:3000
```

## What You Get

✅ **High-Quality Voice Cloning** - Industry-leading quality  
✅ **60+ Languages** - Multilingual support  
✅ **Emotional Control** - Adjust tone, speed, pitch  
✅ **Fast Processing** - Cloud-based inference  
✅ **Automatic Fallback** - Falls back to OpenAI TTS if needed  

## Pricing

- **Free Tier**: 100 API calls/month (perfect for testing)
- **Pro**: $0.006 per second of audio
- **Enterprise**: Custom pricing

## Need Help?

Check the full guide: `CHATTERBOX_SETUP.md`

## Architecture

```
Video Upload
    ↓
Extract Audio → Whisper (transcribe)
    ↓
Translate → GPT-4
    ↓
Chatterbox (voice clone + synthesize) ← You are here!
    ↓
Wav2Lip (lip-sync)
    ↓
Final Video
```

Enjoy your AI dubbing with voice cloning! 🎬
