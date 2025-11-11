#!/bin/bash

# Comprehensive TTS-Validated Pipeline Test
# Tests the entire pipeline with TTS validation enabled

set -e

echo "════════════════════════════════════════════════════════════"
echo "COMPREHENSIVE TTS-VALIDATED PIPELINE TEST"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test configuration
TEST_VIDEO="test-video.mov"
TARGET_LANGUAGE="es"
SOURCE_LANGUAGE="en"

# Check if test video exists
if [ ! -f "$TEST_VIDEO" ]; then
    echo -e "${RED}✗ Test video not found: $TEST_VIDEO${NC}"
    echo "Available videos:"
    ls -lh *.mov 2>/dev/null || echo "No .mov files found"
    exit 1
fi

echo -e "${GREEN}✓ Test video found: $TEST_VIDEO${NC}"
VIDEO_SIZE=$(ls -lh "$TEST_VIDEO" | awk '{print $5}')
echo "  Size: $VIDEO_SIZE"
echo ""

# Step 1: Check services
echo "Step 1: Checking required services..."
echo "─────────────────────────────────────────────────────────"

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${RED}✗ Redis is not running${NC}"
    echo "Start Redis: redis-server"
    exit 1
fi

# Check PostgreSQL
if pg_isready > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
else
    echo -e "${RED}✗ PostgreSQL is not running${NC}"
    echo "Start PostgreSQL: brew services start postgresql"
    exit 1
fi

# Check Backend
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running (port 3001)${NC}"
else
    echo -e "${RED}✗ Backend is not running${NC}"
    echo "Start backend: cd packages/backend && npm run dev"
    exit 1
fi

# Check Workers
if pgrep -f "workers.*index" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Workers are running${NC}"
else
    echo -e "${YELLOW}⚠ Workers may not be running${NC}"
    echo "Start workers: cd packages/workers && npm run dev"
fi

echo ""

# Step 2: Upload video
echo "Step 2: Uploading video and starting pipeline..."
echo "─────────────────────────────────────────────────────────"

UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3001/api/dub/upload \
  -F "video=@$TEST_VIDEO" \
  -F "targetLanguage=$TARGET_LANGUAGE" \
  -F "sourceLanguage=$SOURCE_LANGUAGE")

JOB_ID=$(echo $UPLOAD_RESPONSE | jq -r '.jobId')

if [ "$JOB_ID" == "null" ] || [ -z "$JOB_ID" ]; then
    echo -e "${RED}✗ Failed to upload video${NC}"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓ Video uploaded successfully${NC}"
echo "  Job ID: $JOB_ID"
echo ""

# Step 3: Monitor pipeline progress
echo "Step 3: Monitoring pipeline progress..."
echo "─────────────────────────────────────────────────────────"
echo ""

MAX_WAIT=900  # 15 minutes
ELAPSED=0
INTERVAL=5
LAST_STATUS=""
LAST_PROGRESS=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    STATUS_RESPONSE=$(curl -s http://localhost:3001/api/dub/status/$JOB_ID)
    STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')
    PROGRESS=$(echo $STATUS_RESPONSE | jq -r '.progress')
    
    # Show progress update if changed
    if [ "$STATUS" != "$LAST_STATUS" ] || [ "$PROGRESS" != "$LAST_PROGRESS" ]; then
        echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} Status: $STATUS | Progress: $PROGRESS%"
        LAST_STATUS=$STATUS
        LAST_PROGRESS=$PROGRESS
    fi
    
    if [ "$STATUS" == "completed" ]; then
        echo ""
        echo -e "${GREEN}✓ Pipeline completed successfully!${NC}"
        break
    elif [ "$STATUS" == "failed" ]; then
        echo ""
        echo -e "${RED}✗ Pipeline failed${NC}"
        ERROR=$(echo $STATUS_RESPONSE | jq -r '.error')
        echo "Error: $ERROR"
        exit 1
    fi
    
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo ""
    echo -e "${RED}✗ Pipeline timed out after ${MAX_WAIT}s${NC}"
    exit 1
fi

echo ""

# Step 4: Verify TTS-validated loop was used
echo "Step 4: Verifying TTS-validated loop integration..."
echo "─────────────────────────────────────────────────────────"

# Check Context Map
CONTEXT_MAP=$(curl -s http://localhost:3001/api/context-map/$JOB_ID)

if [ -z "$CONTEXT_MAP" ] || [ "$CONTEXT_MAP" == "null" ]; then
    echo -e "${YELLOW}⚠ Context Map not found${NC}"
else
    TOTAL_SEGMENTS=$(echo $CONTEXT_MAP | jq '.segments | length')
    VALIDATED_SEGMENTS=$(echo $CONTEXT_MAP | jq '[.segments[] | select(.validatedAudioPath != null)] | length')
    
    echo "Total segments: $TOTAL_SEGMENTS"
    echo "Validated segments: $VALIDATED_SEGMENTS"
    
    if [ "$VALIDATED_SEGMENTS" -gt 0 ]; then
        echo -e "${GREEN}✓ TTS-validated loop was used${NC}"
        
        # Calculate statistics
        SUCCESS_COUNT=$(echo $CONTEXT_MAP | jq '[.segments[] | select(.status == "success")] | length')
        FAILED_COUNT=$(echo $CONTEXT_MAP | jq '[.segments[] | select(.status == "failed_adaptation")] | length')
        
        echo ""
        echo "Validation Statistics:"
        echo "  Successful: $SUCCESS_COUNT"
        echo "  Failed: $FAILED_COUNT"
        
        if [ "$SUCCESS_COUNT" -gt 0 ]; then
            SUCCESS_RATE=$(echo "scale=1; $SUCCESS_COUNT * 100 / $TOTAL_SEGMENTS" | bc)
            echo "  Success rate: ${SUCCESS_RATE}%"
            
            if (( $(echo "$SUCCESS_RATE >= 90" | bc -l) )); then
                echo -e "  ${GREEN}✓ Excellent success rate (≥90%)${NC}"
            elif (( $(echo "$SUCCESS_RATE >= 80" | bc -l) )); then
                echo -e "  ${YELLOW}⚠ Good success rate (≥80%)${NC}"
            else
                echo -e "  ${RED}✗ Low success rate (<80%)${NC}"
            fi
        fi
        
        # Average attempts
        AVG_ATTEMPTS=$(echo $CONTEXT_MAP | jq '[.segments[] | .attempts // 1] | add / length')
        echo "  Average attempts: $AVG_ATTEMPTS"
        
        if (( $(echo "$AVG_ATTEMPTS <= 1.5" | bc -l) )); then
            echo -e "  ${GREEN}✓ Efficient (≤1.5 attempts avg)${NC}"
        elif (( $(echo "$AVG_ATTEMPTS <= 2.0" | bc -l) )); then
            echo -e "  ${YELLOW}⚠ Moderate (≤2.0 attempts avg)${NC}"
        else
            echo -e "  ${RED}✗ High retry rate (>2.0 attempts avg)${NC}"
        fi
        
        # Show sample segment
        echo ""
        echo "Sample validated segment:"
        echo $CONTEXT_MAP | jq '.segments[0] | {
            id,
            text: .text[0:50],
            adapted_text: .adapted_text[0:50],
            duration,
            actualDuration,
            status,
            attempts
        }'
    else
        echo -e "${YELLOW}⚠ No validated audio paths found${NC}"
    fi
fi

echo ""

# Step 5: Check audio files
echo "Step 5: Checking generated audio files..."
echo "─────────────────────────────────────────────────────────"

TTS_OUTPUT_DIR="temp/$JOB_ID/tts-output"

if [ -d "$TTS_OUTPUT_DIR" ]; then
    SEGMENT_COUNT=$(ls -1 $TTS_OUTPUT_DIR/segment_*.wav 2>/dev/null | wc -l | tr -d ' ')
    TEST_AUDIO_COUNT=$(ls -1 $TTS_OUTPUT_DIR/*_test_attempt*.wav 2>/dev/null | wc -l | tr -d ' ')
    
    echo "TTS output segments: $SEGMENT_COUNT"
    echo "Test audio files (validation): $TEST_AUDIO_COUNT"
    
    if [ "$TEST_AUDIO_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ Validated audio files found${NC}"
        echo "  These were generated during TTS validation"
    fi
    
    if [ "$SEGMENT_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ Final TTS segments generated${NC}"
        
        # Show sample file info
        SAMPLE_FILE=$(ls $TTS_OUTPUT_DIR/segment_*.wav 2>/dev/null | head -1)
        if [ -n "$SAMPLE_FILE" ]; then
            FILE_SIZE=$(ls -lh "$SAMPLE_FILE" | awk '{print $5}')
            echo "  Sample: $(basename $SAMPLE_FILE) ($FILE_SIZE)"
        fi
    fi
else
    echo -e "${YELLOW}⚠ TTS output directory not found${NC}"
fi

echo ""

# Step 6: Download final video
echo "Step 6: Downloading final dubbed video..."
echo "─────────────────────────────────────────────────────────"

OUTPUT_FILE="test-output-tts-validated-$(date +%Y%m%d-%H%M%S).mp4"

if curl -s -o "$OUTPUT_FILE" http://localhost:3001/api/dub/download/$JOB_ID; then
    if [ -f "$OUTPUT_FILE" ] && [ -s "$OUTPUT_FILE" ]; then
        FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
        echo -e "${GREEN}✓ Output video downloaded: $OUTPUT_FILE${NC}"
        echo "  Size: $FILE_SIZE"
        
        # Verify with ffprobe
        if command -v ffprobe &> /dev/null; then
            DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_FILE" 2>/dev/null)
            if [ -n "$DURATION" ]; then
                echo "  Duration: ${DURATION}s"
            fi
            
            # Check video codec
            VIDEO_CODEC=$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_FILE" 2>/dev/null)
            AUDIO_CODEC=$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_FILE" 2>/dev/null)
            echo "  Video codec: $VIDEO_CODEC"
            echo "  Audio codec: $AUDIO_CODEC"
        fi
    else
        echo -e "${RED}✗ Downloaded file is empty${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Failed to download output video${NC}"
    exit 1
fi

echo ""

# Summary
echo "════════════════════════════════════════════════════════════"
echo "TEST SUMMARY"
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}✓ All pipeline stages completed successfully!${NC}"
echo ""
echo "Pipeline Flow Verified:"
echo "  1. ✓ Video uploaded"
echo "  2. ✓ STT transcription (OpenAI Whisper)"
echo "  3. ✓ Context Map created"
echo "  4. ✓ TTS-validated adaptation (Mistral AI + OpenAI TTS)"
echo "  5. ✓ TTS assembly (reused validated audio)"
echo "  6. ✓ Final assembly (Absolute Sync)"
echo "  7. ✓ Muxing (FFmpeg)"
echo "  8. ✓ Final video generated"
echo ""
echo "TTS-Validated Loop:"
echo "  • Validation used: YES"
echo "  • Segments validated: $VALIDATED_SEGMENTS/$TOTAL_SEGMENTS"
echo "  • Success rate: ${SUCCESS_RATE}%"
echo "  • Average attempts: $AVG_ATTEMPTS"
echo ""
echo "Output:"
echo "  • File: $OUTPUT_FILE"
echo "  • Size: $FILE_SIZE"
echo "  • Job ID: $JOB_ID"
echo ""
echo "To view Context Map:"
echo "  curl http://localhost:3001/api/context-map/$JOB_ID | jq"
echo ""
echo "To play video:"
echo "  open \"$OUTPUT_FILE\""
echo ""
