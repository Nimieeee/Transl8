#!/bin/bash

# Full Pipeline Test with Emotion Service
# Tests: Demucs → Noisereduce → Emotion → Pipeline

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🎬 Full Pipeline Test with Emotion Service"
echo "=========================================="
echo ""

# Step 1: Start pipeline services
echo -e "${BLUE}Step 1: Starting pipeline services...${NC}"
echo "----------------------------------------"

./start-pipeline-services.sh

echo ""

# Step 2: Wait for services to be ready
echo -e "${BLUE}Step 2: Verifying services...${NC}"
echo "----------------------------------------"

sleep 3

SERVICES_OK=0
SERVICES_TOTAL=4

check_service() {
    local name=$1
    local port=$2
    
    if curl -s -f http://localhost:$port/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name (port $port)"
        ((SERVICES_OK++))
        return 0
    else
        echo -e "${RED}✗${NC} $name (port $port) - Not running"
        return 1
    fi
}

check_service "Demucs" 8008
check_service "Noisereduce" 8009
check_service "Emotion" 8010
check_service "OpenVoice" 8007 || echo -e "${YELLOW}  (OpenVoice optional - run ./setup-openvoice.sh to enable)${NC}"

echo ""

if [ $SERVICES_OK -lt 3 ]; then
    echo -e "${RED}❌ Not enough services running${NC}"
    echo "Required: Demucs, Noisereduce, Emotion"
    echo "Optional: OpenVoice"
    exit 1
fi

# Step 3: Test emotion service specifically
echo -e "${BLUE}Step 3: Testing emotion service...${NC}"
echo "----------------------------------------"

EMOTION_HEALTH=$(curl -s http://localhost:8010/health)
echo "Health check response:"
echo "$EMOTION_HEALTH" | python3 -m json.tool 2>/dev/null || echo "$EMOTION_HEALTH"
echo ""

# Step 4: Run full pipeline test
echo -e "${BLUE}Step 4: Running full pipeline test...${NC}"
echo "----------------------------------------"
echo ""

./run-pipeline-cli.sh test-video.mov

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Full Pipeline Test Complete!${NC}"
echo "=========================================="
echo ""

echo -e "${BLUE}Services tested:${NC}"
echo "  ✓ Demucs (vocal isolation)"
echo "  ✓ Noisereduce (noise reduction)"
echo "  ✓ Emotion Analysis (superb/wav2vec2-base-superb-er)"
if [ $SERVICES_OK -eq 4 ]; then
    echo "  ✓ OpenVoice (voice synthesis)"
else
    echo "  ⚠ OpenVoice (not configured)"
fi
echo ""

echo -e "${BLUE}Check the output:${NC}"
echo "  ls -lh pipeline-output-*/"
echo ""
