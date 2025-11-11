#!/bin/bash

echo "🎬 Testing Segment Timing System with Real Video"
echo "================================================="
echo ""

# Find the video file
VIDEO_FILE=$(find ./packages/backend/uploads -name "*Movie*11-6*" -type f 2>/dev/null | sort -r | head -1)

if [ -z "$VIDEO_FILE" ]; then
    echo "❌ Video file not found!"
    exit 1
fi

echo "📹 Video file: $VIDEO_FILE"
echo ""

# Get video info
echo "📊 Video Information:"
if command -v ffprobe &> /dev/null; then
    duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$VIDEO_FILE" 2>/dev/null)
    echo "  Duration: ${duration}s"
    
    # Get video dimensions
    dimensions=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$VIDEO_FILE" 2>/dev/null)
    echo "  Dimensions: $dimensions"
fi
echo ""

# Create test directory
TEST_DIR="./test-real-video-results"
mkdir -p "$TEST_DIR"

echo "🎯 Step 1: Extract Audio"
echo "========================"
AUDIO_FILE="$TEST_DIR/original_audio.wav"

if command -v ffmpeg &> /dev/null; then
    echo "Extracting audio..."
    ffmpeg -i "$VIDEO_FILE" -vn -acodec pcm_s16le -ar 16000 -ac 1 "$AUDIO_FILE" -y -loglevel error 2>&1
    
    if [ -f "$AUDIO_FILE" ]; then
        echo "✅ Audio extracted: $AUDIO_FILE"
        audio_duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO_FILE" 2>/dev/null)
        echo "  Audio duration: ${audio_duration}s"
    else
        echo "❌ Failed to extract audio"
        exit 1
    fi
else
    echo "❌ ffmpeg not found"
    exit 1
fi
echo ""

echo "🎤 Step 2: Transcribe with Whisper (Word-Level Timestamps)"
echo "==========================================================="

if [ -n "$OPENAI_API_KEY" ]; then
    echo "Transcribing with OpenAI Whisper..."
    echo "(This may take 30-60 seconds...)"
    
    # Create Python script for transcription
    cat > "$TEST_DIR/transcribe.py" << 'PYTHON_EOF'
import os
import sys
import json
from openai import OpenAI

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

audio_file_path = sys.argv[1]
output_file = sys.argv[2]

print(f"Transcribing: {audio_file_path}")

with open(audio_file_path, 'rb') as audio_file:
    transcript = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        response_format="verbose_json",
        timestamp_granularities=["word"]
    )

# Save full response
result = {
    "text": transcript.text,
    "words": transcript.words if hasattr(transcript, 'words') else [],
    "language": transcript.language if hasattr(transcript, 'language') else "en"
}

with open(output_file, 'w') as f:
    json.dump(result, f, indent=2)

print(f"✅ Transcription complete!")
print(f"Text: {transcript.text[:100]}...")
print(f"Words with timestamps: {len(result['words'])}")
PYTHON_EOF

    python3 "$TEST_DIR/transcribe.py" "$AUDIO_FILE" "$TEST_DIR/transcript.json"
    
    if [ -f "$TEST_DIR/transcript.json" ]; then
        echo "✅ Transcription saved: $TEST_DIR/transcript.json"
        
        # Display transcript
        echo ""
        echo "Transcript:"
        python3 -c "import json; data=json.load(open('$TEST_DIR/transcript.json')); print(data['text'])"
        echo ""
        
        word_count=$(python3 -c "import json; data=json.load(open('$TEST_DIR/transcript.json')); print(len(data['words']))")
        echo "Words with timestamps: $word_count"
    else
        echo "❌ Transcription failed"
        exit 1
    fi
else
    echo "⚠️  OPENAI_API_KEY not set - skipping transcription"
    echo "Set it with: export OPENAI_API_KEY='your-key-here'"
    exit 1
fi
echo ""

echo "🔍 Step 3: Extract Segments with Segment Service"
echo "================================================="

if [ -f "$TEST_DIR/transcript.json" ]; then
    echo "Calling segment extraction endpoint..."
    
    # Get words from transcript
    words_json=$(python3 -c "import json; data=json.load(open('$TEST_DIR/transcript.json')); print(json.dumps(data['words']))")
    
    curl -s -X POST http://localhost:8010/extract_segments \
        -F "audio=@$AUDIO_FILE" \
        -F "transcript_words=$words_json" \
        > "$TEST_DIR/segments.json"
    
    if [ -f "$TEST_DIR/segments.json" ]; then
        echo "✅ Segments extracted: $TEST_DIR/segments.json"
        
        # Display segment stats
        python3 << 'PYTHON_EOF'
import json
with open('./test-real-video-results/segments.json') as f:
    data = json.load(f)
    print(f"\nSegment Statistics:")
    print(f"  Total segments: {data.get('total_segments', 0)}")
    print(f"  Speech segments: {data.get('speech_segments', 0)}")
    print(f"  Silence segments: {data.get('silence_segments', 0)}")
    print(f"  Interjections: {data.get('interjections', 0)}")
    
    # Show first few segments
    print(f"\nFirst 5 segments:")
    for i, seg in enumerate(data.get('segments', [])[:5]):
        seg_type = "INTERJECTION" if seg.get('is_interjection') else ("SILENCE" if seg.get('is_silence') else "SPEECH")
        print(f"  [{seg['start']:.2f}-{seg['end']:.2f}s] {seg['text'][:30]} ({seg_type})")
PYTHON_EOF
    else
        echo "❌ Segment extraction failed"
    fi
fi
echo ""

echo "🎯 Step 4: Full Dubbing with Segment Service"
echo "============================================="

if [ -f "$TEST_DIR/transcript.json" ] && [ -n "$OPENAI_API_KEY" ]; then
    echo "Running full dubbing pipeline..."
    echo "(This may take 2-5 minutes depending on video length...)"
    
    words_json=$(python3 -c "import json; data=json.load(open('$TEST_DIR/transcript.json')); print(json.dumps(data['words']))")
    
    http_code=$(curl -s -X POST http://localhost:8010/dub \
        -F "audio=@$AUDIO_FILE" \
        -F "transcript_words=$words_json" \
        -F "source_lang=en" \
        -F "target_lang=es" \
        -F "openai_api_key=$OPENAI_API_KEY" \
        -o "$TEST_DIR/dubbed_audio.wav" \
        -w "%{http_code}")
    
    if [ "$http_code" = "200" ] && [ -f "$TEST_DIR/dubbed_audio.wav" ]; then
        echo "✅ Dubbing complete: $TEST_DIR/dubbed_audio.wav"
        
        # Check dubbed audio duration
        dubbed_duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$TEST_DIR/dubbed_audio.wav" 2>/dev/null)
        original_duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO_FILE" 2>/dev/null)
        
        echo ""
        echo "📊 Timing Comparison:"
        echo "  Original audio: ${original_duration}s"
        echo "  Dubbed audio: ${dubbed_duration}s"
        
        # Calculate difference
        diff=$(python3 -c "print(abs($dubbed_duration - $original_duration))")
        echo "  Difference: ${diff}s"
        
        if (( $(echo "$diff < 0.5" | bc -l) )); then
            echo "  ✅ PERFECT TIMING MATCH!"
        elif (( $(echo "$diff < 2.0" | bc -l) )); then
            echo "  ✅ Good timing match"
        else
            echo "  ⚠️  Timing difference detected"
        fi
    else
        echo "❌ Dubbing failed (HTTP $http_code)"
        if [ -f "$TEST_DIR/dubbed_audio.wav" ]; then
            cat "$TEST_DIR/dubbed_audio.wav"
        fi
    fi
else
    echo "⚠️  Skipping dubbing (missing transcript or API key)"
fi
echo ""

echo "🎬 Step 5: Merge Dubbed Audio with Video"
echo "========================================="

if [ -f "$TEST_DIR/dubbed_audio.wav" ]; then
    echo "Merging dubbed audio with original video..."
    
    OUTPUT_VIDEO="$TEST_DIR/dubbed_video.mp4"
    
    ffmpeg -i "$VIDEO_FILE" -i "$TEST_DIR/dubbed_audio.wav" \
        -c:v copy -c:a aac -b:a 192k \
        -map 0:v:0 -map 1:a:0 \
        -shortest \
        "$OUTPUT_VIDEO" \
        -y -loglevel error 2>&1
    
    if [ -f "$OUTPUT_VIDEO" ]; then
        echo "✅ Final dubbed video: $OUTPUT_VIDEO"
        
        # Get final video info
        final_duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_VIDEO" 2>/dev/null)
        echo "  Duration: ${final_duration}s"
        
        file_size=$(ls -lh "$OUTPUT_VIDEO" | awk '{print $5}')
        echo "  Size: $file_size"
    else
        echo "❌ Failed to merge video"
    fi
else
    echo "⚠️  Skipping video merge (no dubbed audio)"
fi
echo ""

echo "📊 Test Results Summary"
echo "======================="
echo ""
echo "Test artifacts saved to: $TEST_DIR/"
echo ""
ls -lh "$TEST_DIR/" 2>/dev/null
echo ""

if [ -f "$OUTPUT_VIDEO" ]; then
    echo "✅ SUCCESS! Full pipeline completed"
    echo ""
    echo "🎉 Results:"
    echo "  • Original video: $VIDEO_FILE"
    echo "  • Dubbed video: $OUTPUT_VIDEO"
    echo "  • Transcript: $TEST_DIR/transcript.json"
    echo "  • Segments: $TEST_DIR/segments.json"
    echo ""
    echo "🎬 Play the dubbed video:"
    echo "  open '$OUTPUT_VIDEO'"
    echo ""
    echo "📊 Compare timing:"
    echo "  Original: ${original_duration}s"
    echo "  Dubbed: ${dubbed_duration}s"
    echo "  Difference: ${diff}s"
else
    echo "⚠️  Partial completion - check logs above"
fi
