#!/bin/bash

# Quick test of Mistral rate limiting fix
# Uses OpenAI Whisper (no Docker services needed)

echo "=========================================="
echo "Testing Mistral Rate Limiting Fix"
echo "=========================================="
echo ""

VIDEO_PATH="./packages/backend/uploads/1762542417284-659615831-tolu.mov"

if [ ! -f "$VIDEO_PATH" ]; then
    echo "❌ Video file not found: $VIDEO_PATH"
    exit 1
fi

echo "✅ Video file found"
echo "📹 File: $VIDEO_PATH"
echo ""

# Create dubbing job
echo "Creating dubbing job..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/dub/upload \
  -F "video=@$VIDEO_PATH" \
  -F "sourceLanguage=en" \
  -F "targetLanguage=es")

echo "Response: $RESPONSE"
echo ""

# Extract job ID
JOB_ID=$(echo $RESPONSE | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    echo "❌ Failed to create job"
    exit 1
fi

echo "✅ Job created: $JOB_ID"
echo ""
echo "Monitoring pipeline progress..."
echo "Watch the worker logs for:"
echo "  1. STT transcription (OpenAI Whisper)"
echo "  2. Context Map creation"
echo "  3. Adaptation with Mistral (should use mistral-small-latest)"
echo "  4. Success rate >= 70% triggers TTS"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

# Monitor for 60 seconds
for i in {1..60}; do
    sleep 1
    echo -n "."
done

echo ""
echo "Check worker logs for results!"
