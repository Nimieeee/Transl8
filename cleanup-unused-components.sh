#!/bin/bash

# Cleanup Script - Remove components not in our pipeline
# Pipeline: OpenAI Whisper → Demucs → Noisereduce → Emotion → Gemini 2.5 Pro → OpenVoice → FFmpeg

set -e

echo "=========================================="
echo "🧹 Cleaning Up Unused Components"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Components to KEEP:${NC}"
echo "  ✅ OpenAI Whisper (STT)"
echo "  ✅ Demucs (vocal isolation)"
echo "  ✅ Noisereduce (noise reduction)"
echo "  ✅ Emotion Analysis"
echo "  ✅ Gemini 2.5 Pro (translation)"
echo "  ✅ OpenVoice (TTS)"
echo "  ✅ FFmpeg/Pydub (assembly)"
echo ""

echo -e "${YELLOW}Components to REMOVE:${NC}"
echo "  ❌ Marian MT (replaced by Gemini 2.5 Pro)"
echo "  ❌ XTTS (replaced by OpenVoice)"
echo "  ❌ StyleTTS (replaced by OpenVoice)"
echo "  ❌ YourTTS (replaced by OpenVoice)"
echo "  ❌ Wav2Lip (not in pipeline)"
echo "  ❌ Local Whisper service (using OpenAI API)"
echo "  ❌ Pyannote service (not needed)"
echo ""

read -p "Continue with cleanup? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}Step 1: Removing unused Docker services${NC}"
echo "----------------------------------------"

# Remove unused Docker service directories
UNUSED_SERVICES=(
    "packages/workers/docker/marian"
    "packages/workers/docker/xtts"
    "packages/workers/docker/styletts"
    "packages/workers/docker/yourtts"
    "packages/workers/docker/wav2lip"
    "packages/workers/docker/whisper"
    "packages/workers/docker/pyannote"
    "packages/workers/docker/segment-dubbing"
)

for service in "${UNUSED_SERVICES[@]}"; do
    if [ -d "$service" ]; then
        echo "Removing $service..."
        rm -rf "$service"
        echo -e "${GREEN}✓ Removed${NC}"
    else
        echo -e "${YELLOW}⚠️  $service not found (already removed)${NC}"
    fi
done

echo ""
echo -e "${BLUE}Step 2: Removing unused adapters${NC}"
echo "----------------------------------------"

# Remove unused adapter files
UNUSED_ADAPTERS=(
    "packages/backend/src/adapters/marian-mt-adapter.ts"
    "packages/backend/src/adapters/xtts-adapter.ts"
    "packages/backend/src/adapters/styletts-adapter.ts"
    "packages/backend/src/adapters/wav2lip-adapter.ts"
    "packages/backend/src/adapters/whisper-pyannote-adapter.ts"
)

for adapter in "${UNUSED_ADAPTERS[@]}"; do
    if [ -f "$adapter" ]; then
        echo "Removing $adapter..."
        rm -f "$adapter"
        echo -e "${GREEN}✓ Removed${NC}"
    else
        echo -e "${YELLOW}⚠️  $adapter not found (already removed)${NC}"
    fi
done

echo ""
echo -e "${BLUE}Step 3: Removing unused workers${NC}"
echo "----------------------------------------"

# Remove unused worker files
UNUSED_WORKERS=(
    "packages/workers/src/mt-worker.ts"
    "packages/workers/src/lipsync-worker.ts"
    "packages/workers/src/dubbing-only.ts"
    "packages/workers/src/dubbing-worker.ts"
)

for worker in "${UNUSED_WORKERS[@]}"; do
    if [ -f "$worker" ]; then
        echo "Removing $worker..."
        rm -f "$worker"
        echo -e "${GREEN}✓ Removed${NC}"
    else
        echo -e "${YELLOW}⚠️  $worker not found (already removed)${NC}"
    fi
done

echo ""
echo -e "${BLUE}Step 4: Removing unused documentation${NC}"
echo "----------------------------------------"

# Remove outdated documentation
UNUSED_DOCS=(
    "packages/workers/MT_WORKER.md"
    "packages/workers/MT_IMPLEMENTATION_SUMMARY.md"
    "packages/workers/TTS_WORKER.md"
    "packages/workers/TTS_IMPLEMENTATION_SUMMARY.md"
    "packages/workers/LIPSYNC_WORKER.md"
    "packages/workers/LIPSYNC_IMPLEMENTATION_SUMMARY.md"
    "packages/workers/LIPSYNC_QUICK_START.md"
    "packages/workers/STT_WORKER.md"
    "YOURTTS_STATUS.md"
    "YOURTTS_TO_OPENVOICE_FIX.md"
    "VOICE_CLONING_STATUS.md"
    "VOICE_CLONING_FIX.md"
    "START_YOURTTS.sh"
)

for doc in "${UNUSED_DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo "Removing $doc..."
        rm -f "$doc"
        echo -e "${GREEN}✓ Removed${NC}"
    else
        echo -e "${YELLOW}⚠️  $doc not found (already removed)${NC}"
    fi
done

echo ""
echo -e "${BLUE}Step 5: Removing unused test files${NC}"
echo "----------------------------------------"

# Remove outdated test files
UNUSED_TESTS=(
    "packages/backend/tests/unit/workers/mt-worker.test.ts"
    "packages/backend/tests/unit/workers/lipsync-worker.test.ts"
    "test_dubbing.py"
    "test-segment-timing.sh"
    "START_SEGMENT_TIMING.sh"
)

for test in "${UNUSED_TESTS[@]}"; do
    if [ -f "$test" ]; then
        echo "Removing $test..."
        rm -f "$test"
        echo -e "${GREEN}✓ Removed${NC}"
    else
        echo -e "${YELLOW}⚠️  $test not found (already removed)${NC}"
    fi
done

echo ""
echo -e "${BLUE}Step 6: Removing unused K8s deployments${NC}"
echo "----------------------------------------"

# Remove K8s configs for unused services
UNUSED_K8S=(
    "k8s/deployments/marian-mt.yaml"
    "k8s/deployments/xtts-tts.yaml"
    "k8s/deployments/styletts-tts.yaml"
    "k8s/deployments/wav2lip-lipsync.yaml"
    "k8s/deployments/whisper-pyannote-stt.yaml"
)

for k8s in "${UNUSED_K8S[@]}"; do
    if [ -f "$k8s" ]; then
        echo "Removing $k8s..."
        rm -f "$k8s"
        echo -e "${GREEN}✓ Removed${NC}"
    else
        echo -e "${YELLOW}⚠️  $k8s not found (already removed)${NC}"
    fi
done

echo ""
echo -e "${BLUE}Step 7: Removing unused benchmark datasets${NC}"
echo "----------------------------------------"

# Remove benchmark files for unused services
UNUSED_BENCHMARKS=(
    "packages/benchmarks/src/datasets/mt-dataset.ts"
    "packages/benchmarks/src/datasets/lipsync-dataset.ts"
)

for benchmark in "${UNUSED_BENCHMARKS[@]}"; do
    if [ -f "$benchmark" ]; then
        echo "Removing $benchmark..."
        rm -f "$benchmark"
        echo -e "${GREEN}✓ Removed${NC}"
    else
        echo -e "${YELLOW}⚠️  $benchmark not found (already removed)${NC}"
    fi
done

echo ""
echo -e "${BLUE}Step 8: Removing unused Python services${NC}"
echo "----------------------------------------"

# Remove Python service files for unused components
UNUSED_PYTHON=(
    "packages/workers/python/segment_dubbing_service.py"
    "packages/workers/python/elevenlabs_dubbing_service.py"
    "packages/workers/python/segment_timing_pipeline.py"
)

for python in "${UNUSED_PYTHON[@]}"; do
    if [ -f "$python" ]; then
        echo "Removing $python..."
        rm -f "$python"
        echo -e "${GREEN}✓ Removed${NC}"
    else
        echo -e "${YELLOW}⚠️  $python not found (already removed)${NC}"
    fi
done

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Cleanup Complete!${NC}"
echo "=========================================="
echo ""

echo -e "${BLUE}Remaining Components (Our Pipeline):${NC}"
echo ""
echo "Docker Services:"
echo "  • packages/workers/docker/demucs/"
echo "  • packages/workers/docker/noisereduce/"
echo "  • packages/workers/docker/emotion/"
echo "  • packages/workers/docker/openvoice/"
echo "  • packages/workers/docker/absolute-sync/"
echo ""
echo "Adapters:"
echo "  • packages/backend/src/adapters/openai-whisper-adapter.ts"
echo "  • packages/backend/src/adapters/demucs-adapter.ts"
echo "  • packages/backend/src/adapters/noisereduce-adapter.ts"
echo "  • packages/backend/src/adapters/emotion-adapter.ts"
echo "  • packages/backend/src/adapters/openvoice-adapter.ts"
echo ""
echo "Workers:"
echo "  • packages/workers/src/stt-worker.ts (OpenAI Whisper)"
echo "  • packages/workers/src/vocal-isolation-worker.ts (Demucs + Noisereduce)"
echo "  • packages/workers/src/emotion-analysis-worker.ts"
echo "  • packages/workers/src/adaptation-worker.ts (Gemini 2.5 Pro)"
echo "  • packages/workers/src/tts-worker.ts (OpenVoice)"
echo "  • packages/workers/src/final-assembly-worker.ts (FFmpeg)"
echo "  • packages/workers/src/muxing-worker.ts"
echo ""
echo "Core Libraries:"
echo "  • packages/backend/src/lib/gemini-client.ts"
echo "  • packages/backend/src/lib/adaptation-engine.ts"
echo "  • packages/backend/src/lib/adaptation-service.ts"
echo "  • packages/backend/src/lib/vocal-isolation.ts"
echo "  • packages/backend/src/lib/emotion-analysis.ts"
echo "  • packages/backend/src/lib/context-map.ts"
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo "1. Review the changes"
echo "2. Update imports in remaining files"
echo "3. Run tests: npm test"
echo "4. Test the pipeline: ./test-full-system.sh"
echo ""

exit 0
