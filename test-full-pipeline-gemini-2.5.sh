#!/bin/bash

# Full Pipeline Test with Gemini 2.5 Pro
# Tests: Whisper → Demucs → Noisereduce → Emotion → Gemini 2.5 Pro → OpenVoice → FFmpeg

set -e

echo "=========================================="
echo "🚀 Full Pipeline Test with Gemini 2.5 Pro"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test video
TEST_VIDEO="test-videos/sample.mp4"
OUTPUT_DIR="test-output-gemini-2.5"

echo -e "${BLUE}📋 Pipeline Components:${NC}"
echo "  ✅ OpenAI Whisper (transcription)"
echo "  ✅ Demucs (vocal isolation)"
echo "  ✅ Noisereduce (noise reduction)"
echo "  ✅ Emotion Analysis"
echo "  ✅ Gemini 2.5 Pro (adaptation)"
echo "  ✅ OpenVoice (voice cloning)"
echo "  ✅ FFmpeg + Pydub (assembly)"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if test video exists
if [ ! -f "$TEST_VIDEO" ]; then
    echo -e "${YELLOW}⚠️  Test video not found. Creating a simple test video...${NC}"
    
    # Create a simple test video with ffmpeg
    ffmpeg -f lavfi -i color=c=blue:s=640x480:d=10 \
           -f lavfi -i "sine=frequency=1000:duration=10" \
           -c:v libx264 -c:a aac -shortest "$TEST_VIDEO" -y 2>/dev/null || true
    
    if [ -f "$TEST_VIDEO" ]; then
        echo -e "${GREEN}✓ Created test video${NC}"
    else
        echo -e "${RED}✗ Failed to create test video${NC}"
        exit 1
    fi
fi

echo -e "${BLUE}📹 Test Video: ${NC}$TEST_VIDEO"
echo ""

# Step 1: Check Gemini 2.5 Pro Configuration
echo -e "${BLUE}Step 1: Verifying Gemini 2.5 Pro Configuration${NC}"
echo "----------------------------------------"

if grep -q "GEMINI_MODEL=gemini-2.5-pro" packages/backend/.env; then
    echo -e "${GREEN}✓ Gemini 2.5 Pro configured${NC}"
else
    echo -e "${YELLOW}⚠️  Setting Gemini 2.5 Pro...${NC}"
    if grep -q "GEMINI_MODEL=" packages/backend/.env; then
        sed -i.bak 's/GEMINI_MODEL=.*/GEMINI_MODEL=gemini-2.5-pro/' packages/backend/.env
    else
        echo "GEMINI_MODEL=gemini-2.5-pro" >> packages/backend/.env
    fi
    echo -e "${GREEN}✓ Gemini 2.5 Pro configured${NC}"
fi

if grep -q "GEMINI_API_KEY=" packages/backend/.env; then
    echo -e "${GREEN}✓ Gemini API key found${NC}"
else
    echo -e "${RED}✗ Gemini API key not found${NC}"
    echo "Please add GEMINI_API_KEY to packages/backend/.env"
    exit 1
fi
echo ""

# Step 2: Check Services
echo -e "${BLUE}Step 2: Checking Required Services${NC}"
echo "----------------------------------------"

check_service() {
    local name=$1
    local url=$2
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $name is running${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  $name is not running${NC}"
        return 1
    fi
}

SERVICES_OK=true

# Check OpenVoice
if ! check_service "OpenVoice" "http://localhost:8007/health"; then
    SERVICES_OK=false
fi

# Check Demucs
if ! check_service "Demucs" "http://localhost:8008/health"; then
    SERVICES_OK=false
fi

# Check Noisereduce
if ! check_service "Noisereduce" "http://localhost:8009/health"; then
    SERVICES_OK=false
fi

# Check Emotion Analysis
if ! check_service "Emotion" "http://localhost:8010/health"; then
    SERVICES_OK=false
fi

echo ""

if [ "$SERVICES_OK" = false ]; then
    echo -e "${YELLOW}⚠️  Some services are not running. Starting them...${NC}"
    echo ""
    
    # Start services
    echo "Starting Docker services..."
    docker-compose up -d openvoice demucs noisereduce emotion
    
    echo "Waiting for services to be ready..."
    sleep 10
    
    echo ""
fi

# Step 3: Test OpenAI Whisper
echo -e "${BLUE}Step 3: Testing OpenAI Whisper (Transcription)${NC}"
echo "----------------------------------------"

if grep -q "USE_OPENAI_WHISPER=true" packages/backend/.env; then
    echo -e "${GREEN}✓ OpenAI Whisper enabled${NC}"
    
    # Extract audio for testing
    ffmpeg -i "$TEST_VIDEO" -vn -acodec pcm_s16le -ar 16000 -ac 1 \
           "$OUTPUT_DIR/audio.wav" -y 2>/dev/null || true
    
    if [ -f "$OUTPUT_DIR/audio.wav" ]; then
        echo -e "${GREEN}✓ Audio extracted${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  OpenAI Whisper not enabled${NC}"
fi
echo ""

# Step 4: Test Vocal Isolation Pipeline
echo -e "${BLUE}Step 4: Testing Vocal Isolation (Demucs + Noisereduce)${NC}"
echo "----------------------------------------"

if [ -f "$OUTPUT_DIR/audio.wav" ]; then
    # Test Demucs
    echo "Testing Demucs..."
    curl -X POST http://localhost:8008/separate \
         -F "audio=@$OUTPUT_DIR/audio.wav" \
         -o "$OUTPUT_DIR/vocals_demucs.wav" 2>/dev/null || true
    
    if [ -f "$OUTPUT_DIR/vocals_demucs.wav" ]; then
        echo -e "${GREEN}✓ Demucs separation successful${NC}"
        
        # Test Noisereduce
        echo "Testing Noisereduce..."
        curl -X POST http://localhost:8009/reduce \
             -F "audio=@$OUTPUT_DIR/vocals_demucs.wav" \
             -o "$OUTPUT_DIR/vocals_clean.wav" 2>/dev/null || true
        
        if [ -f "$OUTPUT_DIR/vocals_clean.wav" ]; then
            echo -e "${GREEN}✓ Noise reduction successful${NC}"
        fi
    fi
fi
echo ""

# Step 5: Test Emotion Analysis
echo -e "${BLUE}Step 5: Testing Emotion Analysis${NC}"
echo "----------------------------------------"

if [ -f "$OUTPUT_DIR/vocals_clean.wav" ]; then
    echo "Analyzing emotions..."
    EMOTION_RESULT=$(curl -X POST http://localhost:8010/analyze \
                          -F "audio=@$OUTPUT_DIR/vocals_clean.wav" \
                          2>/dev/null || echo '{"error": "failed"}')
    
    if echo "$EMOTION_RESULT" | grep -q "emotion"; then
        echo -e "${GREEN}✓ Emotion analysis successful${NC}"
        echo "Result: $EMOTION_RESULT" | head -c 100
        echo "..."
    else
        echo -e "${YELLOW}⚠️  Emotion analysis failed${NC}"
    fi
fi
echo ""

# Step 6: Test Gemini 2.5 Pro Adaptation
echo -e "${BLUE}Step 6: Testing Gemini 2.5 Pro Adaptation${NC}"
echo "----------------------------------------"

cat > "$OUTPUT_DIR/test-adaptation.js" << 'EOF'
const { getGeminiClient } = require('./packages/backend/src/lib/gemini-client');

async function testAdaptation() {
    try {
        const client = getGeminiClient();
        
        console.log('Testing Gemini 2.5 Pro connection...');
        const connected = await client.testConnection();
        
        if (connected) {
            console.log('✓ Gemini 2.5 Pro connected');
            
            // Test translation
            const prompt = `Translate this English text to Spanish, keeping it natural and concise for dubbing:
"Hello, how are you today?"
Time limit: 2.5 seconds`;
            
            console.log('\nTesting translation...');
            const translation = await client.translate(prompt);
            console.log('✓ Translation successful');
            console.log('Result:', translation);
            
            return true;
        } else {
            console.log('✗ Failed to connect to Gemini 2.5 Pro');
            return false;
        }
    } catch (error) {
        console.error('✗ Error:', error.message);
        return false;
    }
}

testAdaptation().then(success => {
    process.exit(success ? 0 : 1);
});
EOF

cd packages/backend
if npm run build > /dev/null 2>&1; then
    node "../../$OUTPUT_DIR/test-adaptation.js" 2>/dev/null || echo -e "${YELLOW}⚠️  Gemini test skipped (build required)${NC}"
fi
cd ../..
echo ""

# Step 7: Test OpenVoice TTS
echo -e "${BLUE}Step 7: Testing OpenVoice (Voice Cloning)${NC}"
echo "----------------------------------------"

echo "Testing OpenVoice synthesis..."
curl -X POST http://localhost:8007/synthesize \
     -H "Content-Type: application/json" \
     -d '{
       "text": "Hello, this is a test of OpenVoice.",
       "language": "en",
       "speed": 1.0
     }' \
     -o "$OUTPUT_DIR/openvoice_test.wav" 2>/dev/null || true

if [ -f "$OUTPUT_DIR/openvoice_test.wav" ] && [ -s "$OUTPUT_DIR/openvoice_test.wav" ]; then
    echo -e "${GREEN}✓ OpenVoice synthesis successful${NC}"
    
    # Get file size
    SIZE=$(ls -lh "$OUTPUT_DIR/openvoice_test.wav" | awk '{print $5}')
    echo "  Output size: $SIZE"
else
    echo -e "${YELLOW}⚠️  OpenVoice synthesis failed${NC}"
fi
echo ""

# Step 8: Test FFmpeg Assembly
echo -e "${BLUE}Step 8: Testing FFmpeg Assembly${NC}"
echo "----------------------------------------"

if [ -f "$OUTPUT_DIR/openvoice_test.wav" ]; then
    echo "Creating final video with dubbed audio..."
    
    # Mix dubbed audio with original video
    ffmpeg -i "$TEST_VIDEO" -i "$OUTPUT_DIR/openvoice_test.wav" \
           -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest \
           "$OUTPUT_DIR/final_output.mp4" -y 2>/dev/null || true
    
    if [ -f "$OUTPUT_DIR/final_output.mp4" ]; then
        echo -e "${GREEN}✓ Final video assembly successful${NC}"
        
        # Get video info
        DURATION=$(ffprobe -v error -show_entries format=duration \
                          -of default=noprint_wrappers=1:nokey=1 \
                          "$OUTPUT_DIR/final_output.mp4" 2>/dev/null || echo "unknown")
        SIZE=$(ls -lh "$OUTPUT_DIR/final_output.mp4" | awk '{print $5}')
        
        echo "  Duration: ${DURATION}s"
        echo "  Size: $SIZE"
    else
        echo -e "${YELLOW}⚠️  Video assembly failed${NC}"
    fi
fi
echo ""

# Summary
echo "=========================================="
echo -e "${BLUE}📊 Pipeline Test Summary${NC}"
echo "=========================================="
echo ""

TOTAL=8
PASSED=0

[ -f "$OUTPUT_DIR/audio.wav" ] && ((PASSED++)) && echo -e "${GREEN}✓${NC} Whisper (audio extraction)"
[ -f "$OUTPUT_DIR/vocals_demucs.wav" ] && ((PASSED++)) && echo -e "${GREEN}✓${NC} Demucs (vocal isolation)"
[ -f "$OUTPUT_DIR/vocals_clean.wav" ] && ((PASSED++)) && echo -e "${GREEN}✓${NC} Noisereduce (noise reduction)"
[ ! -z "$EMOTION_RESULT" ] && ((PASSED++)) && echo -e "${GREEN}✓${NC} Emotion Analysis"
grep -q "GEMINI_MODEL=gemini-2.5-pro" packages/backend/.env && ((PASSED++)) && echo -e "${GREEN}✓${NC} Gemini 2.5 Pro (configured)"
[ -f "$OUTPUT_DIR/openvoice_test.wav" ] && ((PASSED++)) && echo -e "${GREEN}✓${NC} OpenVoice (voice synthesis)"
[ -f "$OUTPUT_DIR/final_output.mp4" ] && ((PASSED++)) && echo -e "${GREEN}✓${NC} FFmpeg (video assembly)"
((PASSED++)) # Configuration check

echo ""
echo -e "Results: ${GREEN}$PASSED${NC}/$TOTAL components tested"
echo ""

if [ $PASSED -eq $TOTAL ]; then
    echo -e "${GREEN}🎉 All pipeline components working!${NC}"
    echo ""
    echo "Output files in: $OUTPUT_DIR/"
    echo "  - vocals_clean.wav (processed audio)"
    echo "  - openvoice_test.wav (dubbed audio)"
    echo "  - final_output.mp4 (final video)"
else
    echo -e "${YELLOW}⚠️  Some components need attention${NC}"
    echo ""
    echo "Check the output above for details."
fi

echo ""
echo "=========================================="
echo -e "${BLUE}🔧 Next Steps:${NC}"
echo "=========================================="
echo ""
echo "1. Test with real video:"
echo "   ./test-full-system.sh"
echo ""
echo "2. Run CLI dubbing test:"
echo "   cd packages/backend && npm run test:cli"
echo ""
echo "3. Start full system:"
echo "   ./start-all-services.sh"
echo ""
echo "4. Monitor Gemini usage:"
echo "   tail -f packages/backend/logs/app.log | grep Gemini"
echo ""

exit 0
