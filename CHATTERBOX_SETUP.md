# 🎙️ Chatterbox by Resemble AI - Setup Guide

Chatterbox is Resemble AI's voice cloning solution that provides high-quality, emotional voice synthesis with excellent multilingual support.

## Why Chatterbox?

- **Superior Voice Cloning**: Industry-leading voice cloning quality
- **Emotional Control**: Adjust emotion, speed, and pitch
- **Multilingual**: Supports 60+ languages
- **Fast Processing**: Cloud-based with optimized inference
- **Production Ready**: Enterprise-grade reliability

## Setup Steps

### 1. Sign Up for Resemble AI

1. Go to https://www.resemble.ai/
2. Create an account (free tier available)
3. Create a new project in the dashboard

### 2. Get API Credentials

1. Navigate to Settings → API Keys
2. Copy your API key
3. Copy your Project UUID from the project settings

### 3. Set Environment Variables

```bash
export RESEMBLE_API_KEY='your_api_key_here'
export RESEMBLE_PROJECT_UUID='your_project_uuid_here'
export CHATTERBOX_SERVICE_URL='http://localhost:5003'
```

Add these to your `.env` file:

```bash
# Chatterbox by Resemble AI
RESEMBLE_API_KEY=your_api_key_here
RESEMBLE_PROJECT_UUID=your_project_uuid_here
CHATTERBOX_SERVICE_URL=http://localhost:5003
```

### 4. Install Dependencies

```bash
./SETUP_CHATTERBOX.sh
```

This will:
- Create a Python virtual environment
- Install Flask and requests
- Set up the Chatterbox service

### 5. Start the Service

```bash
./START_CHATTERBOX.sh
```

The service will run on `http://localhost:5003`

### 6. Test the Integration

```bash
./test-chatterbox.sh
```

## API Endpoints

### Health Check
```bash
curl http://localhost:5003/health
```

### Create Voice Clone
```bash
curl -X POST http://localhost:5003/create_voice \
  -F "audio=@/path/to/voice_sample.wav" \
  -F "name=My Voice Clone"
```

Returns:
```json
{
  "voice_uuid": "abc123...",
  "name": "My Voice Clone"
}
```

### Synthesize Speech
```bash
curl -X POST http://localhost:5003/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test!",
    "voice_uuid": "abc123...",
    "emotion": "happy",
    "speed": 1.0,
    "pitch": 1.0
  }'
```

Returns:
```json
{
  "audio_path": "/tmp/chatterbox_abc123.wav",
  "duration": 2.5
}
```

### List Voices
```bash
curl http://localhost:5003/list_voices
```

### Delete Voice
```bash
curl -X DELETE http://localhost:5003/delete_voice \
  -H "Content-Type: application/json" \
  -d '{"voice_uuid": "abc123..."}'
```

## Features

### Emotion Control
Adjust the emotional tone of the voice:
- `neutral` - Default, natural tone
- `happy` - Upbeat and cheerful
- `sad` - Somber and melancholic
- `angry` - Intense and forceful
- `surprised` - Excited and energetic

### Speed Control
Adjust speech rate (0.5 to 2.0):
- `0.5` - Half speed (slow)
- `1.0` - Normal speed
- `2.0` - Double speed (fast)

### Pitch Control
Adjust voice pitch (0.5 to 2.0):
- `0.5` - Lower pitch
- `1.0` - Normal pitch
- `2.0` - Higher pitch

## Integration with Dubbing Worker

The dubbing worker now uses Chatterbox as the primary TTS engine:

1. **Voice Cloning**: Automatically creates a voice clone from the original audio
2. **Synthesis**: Generates dubbed audio with the cloned voice
3. **Fallback**: Falls back to OpenAI TTS if Chatterbox fails

Priority order:
1. Chatterbox (voice cloning)
2. OpenAI TTS (no voice cloning)
3. XTTS v2 (self-hosted, if available)
4. YourTTS (self-hosted, if available)
5. gTTS (basic fallback)

## Pricing

Resemble AI offers:
- **Free Tier**: 100 API calls/month
- **Pro**: $0.006 per second of audio
- **Enterprise**: Custom pricing

Check https://www.resemble.ai/pricing for current rates.

## Troubleshooting

### Service won't start
- Check that environment variables are set
- Verify API key and project UUID are correct
- Check Python virtual environment is activated

### Voice creation fails
- Ensure audio file is at least 10 seconds long
- Use clean audio without background noise
- Supported formats: WAV, MP3, FLAC

### Synthesis fails
- Verify voice_uuid exists (use list_voices)
- Check text length (max 5000 characters)
- Ensure API quota is not exceeded

## Next Steps

1. Run `./START_CHATTERBOX.sh` to start the service
2. Test with `./test-chatterbox.sh`
3. Upload a video to test the full dubbing pipeline
4. The system will automatically use Chatterbox for voice cloning

## Resources

- Resemble AI Docs: https://docs.resemble.ai/
- API Reference: https://docs.resemble.ai/reference
- Support: support@resemble.ai
