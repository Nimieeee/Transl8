#!/bin/bash

echo "🤖 Testing Full AI Dubbing Pipeline"
echo "===================================="
echo ""

# Check if OpenAI key is configured
if ! grep -q "OPENAI_API_KEY=sk-" packages/workers/.env 2>/dev/null; then
    echo "⚠️  OpenAI API key not configured"
    echo ""
    echo "To test the full AI pipeline, you need to:"
    echo "1. Get an OpenAI API key from: https://platform.openai.com/api-keys"
    echo "2. Edit packages/workers/.env"
    echo "3. Set: OPENAI_API_KEY=sk-your-key-here"
    echo ""
    echo "Without the key, the system will use fallback services:"
    echo "  - Mock transcription (instead of Whisper)"
    echo "  - Mock translation (instead of GPT)"
    echo "  - gTTS (instead of voice cloning)"
    echo ""
    read -p "Continue with fallback services? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if test video exists
if [ ! -f "test-video.mov" ]; then
    echo "❌ Test video not found: test-video.mov"
    echo ""
    echo "Please place a test video file as 'test-video.mov'"
    exit 1
fi

echo "📤 Uploading video..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/dub/upload \
  -F "video=@test-video.mov" \
  -F "targetLanguage=es" \
  -F "sourceLanguage=en")

# Extract job ID
JOB_ID=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['jobId'])" 2>/dev/null)

if [ -z "$JOB_ID" ]; then
    echo "❌ Upload failed"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "✅ Video uploaded successfully"
echo "Job ID: $JOB_ID"
echo ""

echo "🔄 Processing pipeline..."
echo "------------------------"
echo ""

# Monitor progress
for i in {1..60}; do
    STATUS=$(curl -s "http://localhost:3001/api/dub/status/$JOB_ID")
    
    CURRENT_STATUS=$(echo $STATUS | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['status'])" 2>/dev/null)
    PROGRESS=$(echo $STATUS | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['progress'])" 2>/dev/null)
    
    # Progress bar
    FILLED=$((PROGRESS / 5))
    EMPTY=$((20 - FILLED))
    BAR=$(printf "%${FILLED}s" | tr ' ' '█')
    BAR="${BAR}$(printf "%${EMPTY}s" | tr ' ' '░')"
    
    echo -ne "\r[$BAR] $PROGRESS% - $CURRENT_STATUS"
    
    # Check if completed
    if [ "$CURRENT_STATUS" = "completed" ]; then
        echo ""
        echo ""
        echo "✅ Processing complete!"
        echo ""
        
        # Show what services were used
        echo "🔍 Services Used:"
        echo "----------------"
        
        # Check worker logs for service usage
        if grep -q "Using OpenAI Whisper API" packages/workers/worker.log 2>/dev/null; then
            echo "✅ OpenAI Whisper (transcription)"
        else
            echo "⚠️  Mock transcription (no OpenAI key)"
        fi
        
        if grep -q "Using OpenAI GPT" packages/workers/worker.log 2>/dev/null; then
            echo "✅ OpenAI GPT-4o-mini (translation)"
        else
            echo "⚠️  Mock translation (no OpenAI key)"
        fi
        
        if grep -q "Using YourTTS with voice cloning" packages/workers/worker.log 2>/dev/null; then
            echo "✅ YourTTS (voice cloning)"
        elif grep -q "Using XTTS with voice cloning" packages/workers/worker.log 2>/dev/null; then
            echo "✅ XTTS (voice cloning)"
        elif grep -q "Using OpenAI TTS" packages/workers/worker.log 2>/dev/null; then
            echo "✅ OpenAI TTS (no voice cloning)"
        elif grep -q "using gTTS" packages/workers/worker.log 2>/dev/null; then
            echo "✅ gTTS (free, no voice cloning)"
        fi
        
        echo ""
        echo "📥 Download output:"
        echo "-----------------"
        echo "curl http://localhost:3001/api/dub/download/$JOB_ID -o output.mp4"
        echo ""
        echo "Or visit: http://localhost:3000/download/$JOB_ID"
        echo ""
        
        # Check if output has audio
        OUTPUT_FILE=$(find packages/workers/uploads/output -name "${JOB_ID}_dubbed.mp4" 2>/dev/null | head -1)
        if [ -n "$OUTPUT_FILE" ]; then
            echo "🔊 Checking audio..."
            if ffprobe "$OUTPUT_FILE" 2>&1 | grep -q "Audio:"; then
                echo "✅ Output video has audio!"
                
                # Show audio details
                AUDIO_INFO=$(ffprobe "$OUTPUT_FILE" 2>&1 | grep "Audio:" | head -1)
                echo "   $AUDIO_INFO"
            else
                echo "⚠️  Output video has no audio (all TTS services failed)"
            fi
        fi
        
        echo ""
        echo "🎉 Test complete!"
        exit 0
    fi
    
    # Check if failed
    if [ "$CURRENT_STATUS" = "failed" ]; then
        echo ""
        echo ""
        echo "❌ Processing failed"
        
        ERROR=$(echo $STATUS | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('error', 'Unknown error'))" 2>/dev/null)
        echo "Error: $ERROR"
        exit 1
    fi
    
    sleep 2
done

echo ""
echo "⏱️  Timeout waiting for job to complete"
echo "Check status manually: curl http://localhost:3001/api/dub/status/$JOB_ID"
