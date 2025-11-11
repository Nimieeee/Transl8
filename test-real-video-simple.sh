#!/bin/bash

echo "🎬 Testing Segment Timing with Real Video (Simplified)"
echo "======================================================="
echo ""

# Set API key from env file
export OPENAI_API_KEY=$(grep "OPENAI_API_KEY" packages/workers/.env 2>/dev/null | cut -d= -f2 | tr -d '\n\r')

if [ -z "$OPENAI_API_KEY" ]; then
    echo "❌ OPENAI_API_KEY not found in packages/workers/.env"
    echo "Please set it in packages/workers/.env"
    exit 1
fi

echo "✓ API key loaded"

# Find video
VIDEO_FILE=$(find ./packages/backend/uploads -name "*Movie*11-6*" -type f 2>/dev/null | sort -r | head -1)

if [ -z "$VIDEO_FILE" ]; then
    echo "❌ Video file not found!"
    exit 1
fi

echo "📹 Video: $VIDEO_FILE"

# Create test directory
TEST_DIR="./test-real-video-results"
mkdir -p "$TEST_DIR"

# Extract audio
echo ""
echo "🎯 Step 1: Extract Audio"
AUDIO_FILE="$TEST_DIR/original_audio.wav"
ffmpeg -i "$VIDEO_FILE" -vn -acodec pcm_s16le -ar 16000 -ac 1 "$AUDIO_FILE" -y -loglevel error 2>&1

if [ ! -f "$AUDIO_FILE" ]; then
    echo "❌ Failed to extract audio"
    exit 1
fi

audio_duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO_FILE" 2>/dev/null)
echo "✅ Audio extracted: ${audio_duration}s"

# Transcribe with Whisper API
echo ""
echo "🎤 Step 2: Transcribe with Whisper"
echo "(This may take 30-60 seconds...)"

curl -s -X POST https://api.openai.com/v1/audio/transcriptions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -F file="@$AUDIO_FILE" \
  -F model="whisper-1" \
  -F response_format="verbose_json" \
  -F "timestamp_granularities[]=word" \
  > "$TEST_DIR/transcript.json"

if [ ! -f "$TEST_DIR/transcript.json" ] || ! grep -q "text" "$TEST_DIR/transcript.json"; then
    echo "❌ Transcription failed"
    cat "$TEST_DIR/transcript.json"
    exit 1
fi

# Extract transcript text and word count
transcript_text=$(python3 -c "import json; print(json.load(open('$TEST_DIR/transcript.json'))['text'])" 2>/dev/null)
word_count=$(python3 -c "import json; print(len(json.load(open('$TEST_DIR/transcript.json')).get('words', [])))" 2>/dev/null)

echo "✅ Transcription complete"
echo "Text: $transcript_text"
echo "Words with timestamps: $word_count"

# Extract segments
echo ""
echo "🔍 Step 3: Extract Segments"

words_json=$(python3 -c "import json; print(json.dumps(json.load(open('$TEST_DIR/transcript.json')).get('words', [])))" 2>/dev/null)

curl -s -X POST http://localhost:8010/extract_segments \
    -F "audio=@$AUDIO_FILE" \
    -F "transcript_words=$words_json" \
    > "$TEST_DIR/segments.json"

if [ -f "$TEST_DIR/segments.json" ] && grep -q "segments" "$TEST_DIR/segments.json"; then
    echo "✅ Segments extracted"
    
    python3 << 'EOF'
import json
with open('./test-real-video-results/segments.json') as f:
    data = json.load(f)
    print(f"  Total segments: {data.get('total_segments', 0)}")
    print(f"  Speech: {data.get('speech_segments', 0)}, Silence: {data.get('silence_segments', 0)}, Interjections: {data.get('interjections', 0)}")
EOF
else
    echo "❌ Segment extraction failed"
    cat "$TEST_DIR/segments.json"
fi

# Full dubbing
echo ""
echo "🎯 Step 4: Full Dubbing Pipeline"
echo "(This may take 2-5 minutes...)"

http_code=$(curl -s -X POST http://localhost:8010/dub \
    -F "audio=@$AUDIO_FILE" \
    -F "transcript_words=$words_json" \
    -F "source_lang=en" \
    -F "target_lang=es" \
    -F "openai_api_key=$OPENAI_API_KEY" \
    -o "$TEST_DIR/dubbed_audio.wav" \
    -w "%{http_code}")

if [ "$http_code" = "200" ] && [ -f "$TEST_DIR/dubbed_audio.wav" ]; then
    dubbed_duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TEST_DIR/dubbed_audio.wav" 2>/dev/null)
    
    echo "✅ Dubbing complete!"
    echo ""
    echo "📊 Timing Comparison:"
    echo "  Original: ${audio_duration}s"
    echo "  Dubbed: ${dubbed_duration}s"
    
    diff=$(python3 -c "print(f'{abs(float(\"$dubbed_duration\") - float(\"$audio_duration\")):.3f}')")
    echo "  Difference: ${diff}s"
    
    if (( $(echo "$diff < 0.5" | bc -l 2>/dev/null || echo 0) )); then
        echo "  ✅ PERFECT TIMING MATCH!"
    else
        echo "  ⚠️  Timing difference: ${diff}s"
    fi
else
    echo "❌ Dubbing failed (HTTP $http_code)"
fi

# Merge with video
echo ""
echo "🎬 Step 5: Create Final Video"

if [ -f "$TEST_DIR/dubbed_audio.wav" ]; then
    OUTPUT_VIDEO="$TEST_DIR/dubbed_video.mp4"
    
    ffmpeg -i "$VIDEO_FILE" -i "$TEST_DIR/dubbed_audio.wav" \
        -c:v copy -c:a aac -b:a 192k \
        -map 0:v:0 -map 1:a:0 \
        -shortest \
        "$OUTPUT_VIDEO" \
        -y -loglevel error 2>&1
    
    if [ -f "$OUTPUT_VIDEO" ]; then
        final_duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_VIDEO" 2>/dev/null)
        file_size=$(ls -lh "$OUTPUT_VIDEO" | awk '{print $5}')
        
        echo "✅ Final video created!"
        echo "  File: $OUTPUT_VIDEO"
        echo "  Duration: ${final_duration}s"
        echo "  Size: $file_size"
        echo ""
        echo "🎉 SUCCESS! Play with: open '$OUTPUT_VIDEO'"
    else
        echo "❌ Failed to create final video"
    fi
fi

echo ""
echo "📁 All files saved to: $TEST_DIR/"
ls -lh "$TEST_DIR/" 2>/dev/null
