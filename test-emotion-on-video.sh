#!/bin/bash

# Test Emotion Service on Real Video
# Extracts audio and analyzes emotion

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

VIDEO="${1:-test-video.mov}"
OUTPUT_DIR="emotion-test-$(date +%Y%m%d-%H%M%S)"

echo "=========================================="
echo "🎭 Emotion Analysis Test on Real Video"
echo "=========================================="
echo ""

# Check video exists
if [ ! -f "$VIDEO" ]; then
    echo -e "${RED}❌ Video not found: $VIDEO${NC}"
    exit 1
fi

# Check emotion service
if ! curl -s -f http://localhost:8010/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Emotion service not running${NC}"
    echo "Start with: ./start-emotion-service.sh"
    exit 1
fi

echo -e "${GREEN}✓ Emotion service is running${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Extract audio
echo -e "${BLUE}Extracting audio from video...${NC}"
ffmpeg -i "$VIDEO" -vn -acodec pcm_s16le -ar 16000 -ac 1 \
       "$OUTPUT_DIR/audio.wav" -y 2>&1 | tail -3

if [ ! -f "$OUTPUT_DIR/audio.wav" ]; then
    echo -e "${RED}❌ Failed to extract audio${NC}"
    exit 1
fi

AUDIO_SIZE=$(ls -lh "$OUTPUT_DIR/audio.wav" | awk '{print $5}')
echo -e "${GREEN}✓ Audio extracted: $AUDIO_SIZE${NC}"
echo ""

# Analyze emotion
echo -e "${BLUE}Analyzing emotion...${NC}"

AUDIO_PATH="$(cd "$OUTPUT_DIR" && pwd)/audio.wav"

RESULT=$(curl -X POST http://localhost:8010/analyze \
              -H "Content-Type: application/json" \
              -d "{\"audio_path\": \"$AUDIO_PATH\"}" \
              2>/dev/null)

if echo "$RESULT" | grep -q "emotion"; then
    echo -e "${GREEN}✓ Emotion analysis complete${NC}"
    echo ""
    
    # Save result
    echo "$RESULT" > "$OUTPUT_DIR/emotion_result.json"
    
    # Display results
    echo "=========================================="
    echo "Results:"
    echo "=========================================="
    echo "$RESULT" | python3 -m json.tool
    echo ""
    
    # Extract key info
    EMOTION=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin)['emotion'])")
    CONFIDENCE=$(echo "$RESULT" | python3 -c "import sys, json; print(f\"{json.load(sys.stdin)['confidence']:.1%}\")")
    PROC_TIME=$(echo "$RESULT" | python3 -c "import sys, json; print(f\"{json.load(sys.stdin)['processing_time_ms']:.0f}ms\")")
    
    echo "=========================================="
    echo -e "${GREEN}✅ Emotion Detected: $EMOTION${NC}"
    echo "=========================================="
    echo "  Confidence: $CONFIDENCE"
    echo "  Processing time: $PROC_TIME"
    echo "  Model: superb/wav2vec2-base-superb-er"
    echo ""
    
    echo -e "${BLUE}All emotion scores:${NC}"
    echo "$RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for emotion, score in sorted(data['scores'].items(), key=lambda x: x[1], reverse=True):
    print(f'  {emotion:10s}: {score:.1%}')
"
    echo ""
    
    echo -e "${BLUE}Output saved to:${NC}"
    echo "  $OUTPUT_DIR/emotion_result.json"
    echo ""
    
else
    echo -e "${RED}❌ Emotion analysis failed${NC}"
    echo "$RESULT"
    exit 1
fi
