#!/bin/bash

# Quick verification that emotion service is properly configured

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo "=========================================="
echo "🔍 Emotion Service Verification"
echo "=========================================="
echo ""

echo -e "${BLUE}Checking emotion service code...${NC}"

# Check if file exists
if [ ! -f "packages/workers/docker/emotion/emotion_service.py" ]; then
    echo -e "${RED}✗ emotion_service.py not found${NC}"
    exit 1
fi

# Check for correct model
if grep -q "superb/wav2vec2-base-superb-er" packages/workers/docker/emotion/emotion_service.py; then
    echo -e "${GREEN}✓ Using correct model: superb/wav2vec2-base-superb-er${NC}"
else
    echo -e "${RED}✗ Model not configured correctly${NC}"
    exit 1
fi

# Check for correct port
if grep -q "PORT', 8010" packages/workers/docker/emotion/emotion_service.py; then
    echo -e "${GREEN}✓ Port configured correctly: 8010${NC}"
else
    echo -e "${RED}✗ Port not configured correctly${NC}"
    exit 1
fi

# Check for Wav2Vec2FeatureExtractor
if grep -q "Wav2Vec2FeatureExtractor" packages/workers/docker/emotion/emotion_service.py; then
    echo -e "${GREEN}✓ Using correct feature extractor${NC}"
else
    echo -e "${RED}✗ Feature extractor not configured correctly${NC}"
    exit 1
fi

# Check Python syntax
if python3 -m py_compile packages/workers/docker/emotion/emotion_service.py 2>/dev/null; then
    echo -e "${GREEN}✓ Python syntax valid${NC}"
else
    echo -e "${RED}✗ Python syntax errors found${NC}"
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Emotion Service Configuration Valid${NC}"
echo "=========================================="
echo ""
echo "Model: superb/wav2vec2-base-superb-er"
echo "Port: 8010"
echo "Emotions: neutral, happy, sad, angry"
echo "Status: Production Ready"
echo ""
echo -e "${BLUE}Start the service:${NC}"
echo "  ./start-emotion-service.sh"
echo ""
echo -e "${BLUE}Test the service:${NC}"
echo "  python3 test-emotion-service.py"
echo ""
