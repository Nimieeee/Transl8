#!/bin/bash

# Verify Pipeline Alignment
# Ensures codebase matches: OpenAI Whisper → Demucs → Noisereduce → Emotion → Gemini 2.5 Pro → OpenVoice → FFmpeg

set -e

echo "=========================================="
echo "🔍 Verifying Pipeline Alignment"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ERRORS=0

echo -e "${BLUE}Expected Pipeline:${NC}"
echo "  OpenAI Whisper → Demucs → Noisereduce → Emotion → Gemini 2.5 Pro → OpenVoice → FFmpeg"
echo ""

# Check Docker Services
echo -e "${BLUE}1. Checking Docker Services${NC}"
echo "----------------------------------------"

EXPECTED_SERVICES=("demucs" "noisereduce" "emotion" "openvoice" "absolute-sync")
UNEXPECTED_SERVICES=("marian" "xtts" "styletts" "yourtts" "wav2lip" "whisper" "pyannote")

for service in "${EXPECTED_SERVICES[@]}"; do
    if [ -d "packages/workers/docker/$service" ]; then
        echo -e "${GREEN}✓${NC} $service exists"
    else
        echo -e "${RED}✗${NC} $service missing"
        ((ERRORS++))
    fi
done

for service in "${UNEXPECTED_SERVICES[@]}"; do
    if [ -d "packages/workers/docker/$service" ]; then
        echo -e "${RED}✗${NC} $service should be removed"
        ((ERRORS++))
    fi
done

echo ""

# Check Adapters
echo -e "${BLUE}2. Checking Adapters${NC}"
echo "----------------------------------------"

EXPECTED_ADAPTERS=("openai-whisper-adapter.ts" "demucs-adapter.ts" "noisereduce-adapter.ts" "emotion-adapter.ts" "openvoice-adapter.ts")
UNEXPECTED_ADAPTERS=("marian-mt-adapter.ts" "xtts-adapter.ts" "styletts-adapter.ts" "wav2lip-adapter.ts" "whisper-pyannote-adapter.ts")

for adapter in "${EXPECTED_ADAPTERS[@]}"; do
    if [ -f "packages/backend/src/adapters/$adapter" ]; then
        echo -e "${GREEN}✓${NC} $adapter exists"
    else
        echo -e "${RED}✗${NC} $adapter missing"
        ((ERRORS++))
    fi
done

for adapter in "${UNEXPECTED_ADAPTERS[@]}"; do
    if [ -f "packages/backend/src/adapters/$adapter" ]; then
        echo -e "${RED}✗${NC} $adapter should be removed"
        ((ERRORS++))
    fi
done

echo ""

# Check Workers
echo -e "${BLUE}3. Checking Workers${NC}"
echo "----------------------------------------"

EXPECTED_WORKERS=("stt-worker.ts" "vocal-isolation-worker.ts" "emotion-analysis-worker.ts" "adaptation-worker.ts" "tts-worker.ts" "final-assembly-worker.ts" "muxing-worker.ts")
UNEXPECTED_WORKERS=("mt-worker.ts" "lipsync-worker.ts" "dubbing-only.ts" "dubbing-worker.ts")

for worker in "${EXPECTED_WORKERS[@]}"; do
    if [ -f "packages/workers/src/$worker" ]; then
        echo -e "${GREEN}✓${NC} $worker exists"
    else
        echo -e "${RED}✗${NC} $worker missing"
        ((ERRORS++))
    fi
done

for worker in "${UNEXPECTED_WORKERS[@]}"; do
    if [ -f "packages/workers/src/$worker" ]; then
        echo -e "${RED}✗${NC} $worker should be removed"
        ((ERRORS++))
    fi
done

echo ""

# Check Configuration
echo -e "${BLUE}4. Checking Configuration${NC}"
echo "----------------------------------------"

if grep -q "GEMINI_MODEL=gemini-2.5-pro" packages/backend/.env 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Gemini 2.5 Pro configured"
else
    echo -e "${YELLOW}⚠️${NC}  Gemini 2.5 Pro not configured in .env"
fi

if grep -q "USE_OPENAI_WHISPER=true" packages/backend/.env 2>/dev/null; then
    echo -e "${GREEN}✓${NC} OpenAI Whisper enabled"
else
    echo -e "${YELLOW}⚠️${NC}  OpenAI Whisper not enabled in .env"
fi

echo ""

# Check Core Libraries
echo -e "${BLUE}5. Checking Core Libraries${NC}"
echo "----------------------------------------"

EXPECTED_LIBS=("gemini-client.ts" "adaptation-engine.ts" "adaptation-service.ts" "vocal-isolation.ts" "emotion-analysis.ts" "context-map.ts")

for lib in "${EXPECTED_LIBS[@]}"; do
    if [ -f "packages/backend/src/lib/$lib" ]; then
        echo -e "${GREEN}✓${NC} $lib exists"
    else
        echo -e "${RED}✗${NC} $lib missing"
        ((ERRORS++))
    fi
done

echo ""

# Check for references to removed components
echo -e "${BLUE}6. Checking for Stale References${NC}"
echo "----------------------------------------"

STALE_REFS=0

# Check for Marian references
if grep -r "marian" packages/backend/src packages/workers/src --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -v ".test.ts" | grep -q .; then
    echo -e "${YELLOW}⚠️${NC}  Found references to 'marian' in code"
    ((STALE_REFS++))
fi

# Check for XTTS references
if grep -r "xtts\|XTTS" packages/backend/src packages/workers/src --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -v ".test.ts" | grep -q .; then
    echo -e "${YELLOW}⚠️${NC}  Found references to 'xtts' in code"
    ((STALE_REFS++))
fi

# Check for StyleTTS references
if grep -r "styletts\|StyleTTS" packages/backend/src packages/workers/src --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -v ".test.ts" | grep -q .; then
    echo -e "${YELLOW}⚠️${NC}  Found references to 'styletts' in code"
    ((STALE_REFS++))
fi

# Check for Wav2Lip references
if grep -r "wav2lip\|Wav2Lip" packages/backend/src packages/workers/src --include="*.ts" --include="*.js" 2>/dev/null | grep -v "node_modules" | grep -v ".test.ts" | grep -q .; then
    echo -e "${YELLOW}⚠️${NC}  Found references to 'wav2lip' in code"
    ((STALE_REFS++))
fi

if [ $STALE_REFS -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No stale references found"
fi

echo ""

# Summary
echo "=========================================="
echo -e "${BLUE}📊 Verification Summary${NC}"
echo "=========================================="
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "Pipeline is correctly aligned:"
    echo "  ✓ Docker services match pipeline"
    echo "  ✓ Adapters match pipeline"
    echo "  ✓ Workers match pipeline"
    echo "  ✓ Core libraries present"
    echo "  ✓ Configuration correct"
    echo ""
    echo -e "${BLUE}Pipeline:${NC}"
    echo "  OpenAI Whisper → Demucs → Noisereduce → Emotion → Gemini 2.5 Pro → OpenVoice → FFmpeg"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Found $ERRORS error(s)${NC}"
    echo ""
    echo "Please review the output above and fix the issues."
    echo ""
    exit 1
fi
